use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
}

#[tauri::command]
async fn native_fetch(
    url: String,
    method: Option<String>,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let method_str = method.unwrap_or_else(|| "GET".to_string()).to_uppercase();
    let req_method = match method_str.as_str() {
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        "PATCH" => reqwest::Method::PATCH,
        _ => reqwest::Method::GET,
    };

    let mut builder = client.request(req_method, &url);

    // If target is YouTube or Apple Music, inject required Origin & Referer headers
    let is_youtube = url.contains("youtube.com") || url.contains("googlevideo.com");
    let is_apple = url.contains("music.apple.com");

    let mut sent_headers = std::collections::HashMap::new();
    if let Some(h) = headers {
        for (k, v) in h {
            sent_headers.insert(k.to_lowercase(), v);
        }
    }

    if is_apple {
        sent_headers.insert("origin".to_string(), "https://music.apple.com".to_string());
        sent_headers.insert("referer".to_string(), "https://music.apple.com/".to_string());
    } else if is_youtube {
        let origin = if url.contains("://www.youtube.com/") {
            "https://www.youtube.com"
        } else {
            "https://music.youtube.com"
        };
        sent_headers.insert("origin".to_string(), origin.to_string());
        sent_headers.insert("referer".to_string(), format!("{}/", origin));
    }

    for (k, v) in sent_headers {
        if let (Ok(name), Ok(val)) = (
            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
            reqwest::header::HeaderValue::from_str(&v),
        ) {
            builder = builder.header(name, val);
        }
    }

    if let Some(b) = body {
        builder = builder.body(b);
    }

    let resp = builder.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let status_text = resp.status().canonical_reason().unwrap_or("").to_string();

    let mut res_headers = std::collections::HashMap::new();
    for (k, v) in resp.headers() {
        if let Ok(v_str) = v.to_str() {
            res_headers.insert(k.as_str().to_lowercase(), v_str.to_string());
        }
    }

    let body_text = resp.text().await.map_err(|e| e.to_string())?;

    Ok(HttpResponse {
        status,
        status_text,
        headers: res_headers,
        body: body_text,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Register native fetch command
        .invoke_handler(tauri::generate_handler![native_fetch])
        // Single instance plugin: if SpoPlayer is already running, focus existing window
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // Build the Native System Tray Menu
            let show_i = MenuItem::with_id(app, "show", "Mostrar SpoPlayer", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Salir de SpoPlayer", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // Build Tray Icon
            let icon = app.default_window_icon().unwrap().clone();
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("SpoPlayer")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
