const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'languages', 'locales');
const locales = ['en', 'es', 'de', 'fr', 'it', 'pl', 'pt', 'ru', 'tr', 'uk'];

// Deep merge helper
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else if (target[key] === undefined || target[key] === null || target[key] === '') {
      target[key] = source[key];
    }
  }
  return target;
}

// Translations for missing sections
const additions = {
  en: {
    common: {
      minimize: "Minimize",
      maximize: "Maximize",
      restore: "Restore",
      exitFullscreen: "Exit fullscreen",
      song: "song",
      songs: "songs",
      tracks_count: "tracks",
      sidebar: {
        expand: "Expand sidebar",
        collapse: "Collapse sidebar",
        likes: "Liked Songs",
        favorites: "Favorites",
        create_playlist: "Create playlist",
        create_playlist_desc: "Create a list from scratch",
        import_playlist: "Import from another app",
        import_playlist_desc: "Spotify, YouTube, etc.",
        created_in_app: "Created in app",
        empty_created: "No playlists created",
        imported_playlists: "Imported from another app",
        empty_imported: "No imported playlists",
        imported: "Imported"
      }
    },
    library: {
      tab_downloads: "Downloads"
    },
    offline: {
      title: "Downloaded Music",
      subtitle: "Listen to your music without an internet connection or cellular data.",
      download_track: "Download track",
      remove_download: "Remove download",
      download_playlist: "Download playlist",
      playlist_downloaded: "Playlist downloaded",
      remove_playlist_downloads: "Remove playlist downloads",
      downloading: "Downloading...",
      download_success: "Track downloaded for offline listening",
      removed_success: "Download removed",
      empty_title: "No downloaded music",
      empty_desc: "Download songs from any playlist or album to listen offline anytime.",
      play_all: "Play all",
      shuffle: "Shuffle",
      clear_all: "Delete all downloads",
      clear_all_confirm: "Delete all downloads?",
      clear_all_confirm_desc: "This will remove all downloaded songs from local device storage.",
      search_placeholder: "Search downloaded music...",
      badge_offline: "Downloaded"
    },
    player: {
      volume: "Volume",
      previous: "Previous track",
      next: "Next track",
      repeat: "Repeat",
      open_player: "Open player"
    },
    import: {
      status_queued_position: "Queue position: #{position}",
      status_queued_position_sub: "Waiting for server slot..."
    },
    settings: {
      miniplayer: {
        description: "Compact desktop miniplayer behavior and appearance.",
        auto_show_on_minimize: {
          title: "Auto-show when minimized",
          description: "Show compact player when the main window is minimized."
        },
        show_timeline: {
          title: "Show progress timeline",
          description: "Display progress bar in the miniplayer."
        },
        close_on_restore: {
          title: "Close on restore",
          description: "Automatically close miniplayer when restoring main window."
        },
        always_on_top: {
          title: "Always on top",
          description: "Keep miniplayer above other windows."
        },
        custom_background: {
          title: "Use custom wallpaper",
          description: "Apply active window wallpaper to miniplayer.",
          no_wallpaper_description: "Set a wallpaper in Customization to enable."
        },
        test_toggle: {
          title: "Test miniplayer",
          description: "Toggle miniplayer window preview.",
          button: "Toggle"
        },
        hotkeys: {
          title: "Keyboard shortcuts",
          description: "Configure shortcuts in the Shortcuts tab."
        }
      }
    }
  },

  es: {
    common: {
      minimize: "Minimizar",
      maximize: "Maximizar",
      restore: "Restaurar",
      exitFullscreen: "Salir de pantalla completa",
      song: "canción",
      songs: "canciones",
      tracks_count: "canciones",
      sidebar: {
        expand: "Expandir barra lateral",
        collapse: "Contraer barra lateral",
        likes: "Mis Me Gustas",
        favorites: "Favoritos",
        create_playlist: "Crear playlist",
        create_playlist_desc: "Crea una lista desde cero",
        import_playlist: "Importar desde otra app",
        import_playlist_desc: "Spotify, YouTube, etc.",
        created_in_app: "Hechas en la app",
        empty_created: "Sin playlists creadas",
        imported_playlists: "Importadas desde otra app",
        empty_imported: "Sin playlists importadas",
        imported: "Importada"
      }
    },
    library: {
      tab_downloads: "Descargas"
    },
    offline: {
      title: "Música descargada",
      subtitle: "Escucha tus canciones sin conexión a internet ni consumo de datos móviles.",
      download_track: "Descargar canción",
      remove_download: "Eliminar descarga",
      download_playlist: "Descargar playlist",
      playlist_downloaded: "Playlist descargada",
      remove_playlist_downloads: "Eliminar descargas de la playlist",
      downloading: "Descargando...",
      download_success: "Canción descargada para escuchar sin conexión",
      removed_success: "Descarga eliminada",
      empty_title: "No tienes música descargada",
      empty_desc: "Descarga canciones desde cualquier playlist o álbum para escucharlas sin conexión.",
      play_all: "Reproducir todo",
      shuffle: "Aleatorio",
      clear_all: "Borrar todas las descargas",
      clear_all_confirm: "¿Borrar todas las descargas?",
      clear_all_confirm_desc: "Esto eliminará todas las canciones descargadas del almacenamiento local.",
      search_placeholder: "Buscar música descargada...",
      badge_offline: "Descargada"
    },
    player: {
      volume: "Volumen",
      previous: "Canción anterior",
      next: "Siguiente canción",
      repeat: "Repetir",
      open_player: "Abrir reproductor"
    },
    settings: {
      miniplayer: {
        description: "Comportamiento y aspecto del mini reproductor compacto.",
        auto_show_on_minimize: {
          title: "Mostrar automáticamente al minimizar",
          description: "Muestra el mini reproductor cuando se minimiza la ventana principal."
        },
        show_timeline: {
          title: "Mostrar barra de progreso",
          description: "Muestra la línea de tiempo en el mini reproductor."
        },
        close_on_restore: {
          title: "Cerrar al restaurar",
          description: "Cierra automáticamente el mini reproductor al restaurar la ventana."
        },
        always_on_top: {
          title: "Siempre visible",
          description: "Mantiene el mini reproductor encima de otras ventanas."
        },
        custom_background: {
          title: "Usar fondo de pantalla",
          description: "Aplica el wallpaper activo al mini reproductor.",
          no_wallpaper_description: "Configura un fondo en Personalización para activarlo."
        },
        test_toggle: {
          title: "Probar mini reproductor",
          description: "Alterna la vista previa de la ventana del mini reproductor.",
          button: "Alternar"
        },
        hotkeys: {
          title: "Atajos de teclado",
          description: "Configura los atajos en la pestaña de Atajos."
        }
      }
    }
  },

  de: {
    common: {
      minimize: "Minimieren",
      maximize: "Maximieren",
      restore: "Wiederherstellen",
      exitFullscreen: "Vollbild beenden",
      song: "Titel",
      songs: "Titel",
      tracks_count: "Titel",
      sidebar: {
        expand: "Seitenleiste erweitern",
        collapse: "Seitenleiste einklappen",
        likes: "Lieblingslieder",
        favorites: "Favoriten",
        create_playlist: "Playlist erstellen",
        create_playlist_desc: "Eine Liste von Grund auf erstellen",
        import_playlist: "Aus anderer App importieren",
        import_playlist_desc: "Spotify, YouTube usw.",
        created_in_app: "In der App erstellt",
        empty_created: "Keine Playlists erstellt",
        imported_playlists: "Aus anderer App importiert",
        empty_imported: "Keine importierten Playlists",
        imported: "Importiert"
      }
    },
    library: {
      tab_downloads: "Downloads"
    },
    offline: {
      title: "Heruntergeladene Musik",
      subtitle: "Höre deine Musik ohne Internetverbindung oder mobile Daten.",
      download_track: "Titel herunterladen",
      remove_download: "Download entfernen",
      download_playlist: "Playlist herunterladen",
      playlist_downloaded: "Playlist heruntergeladen",
      remove_playlist_downloads: "Playlist-Downloads entfernen",
      downloading: "Wird heruntergeladen...",
      download_success: "Titel für Offline-Wiedergabe heruntergeladen",
      removed_success: "Download entfernt",
      empty_title: "Keine heruntergeladene Musik",
      empty_desc: "Lade Titel aus Playlists oder Alben herunter, um sie jederzeit offline zu hören.",
      play_all: "Alle abspielen",
      shuffle: "Zufallswiedergabe",
      clear_all: "Alle Downloads löschen",
      clear_all_confirm: "Alle Downloads löschen?",
      clear_all_confirm_desc: "Dadurch werden alle heruntergeladenen Titel vom lokalen Speicher entfernt.",
      search_placeholder: "Heruntergeladene Musik suchen...",
      badge_offline: "Heruntergeladen"
    },
    player: {
      volume: "Lautstärke",
      previous: "Vorheriger Titel",
      next: "Nächster Titel",
      repeat: "Wiederholen",
      open_player: "Player öffnen"
    }
  },

  fr: {
    common: {
      minimize: "Réduire",
      maximize: "Agrandir",
      restore: "Restaurer",
      exitFullscreen: "Quitter le plein écran",
      song: "morceau",
      songs: "morceaux",
      tracks_count: "pistes",
      sidebar: {
        expand: "Agrandir le panneau latéral",
        collapse: "Réduire le panneau latéral",
        likes: "Titres likés",
        favorites: "Favoris",
        create_playlist: "Créer une playlist",
        create_playlist_desc: "Créer une liste personnalisée",
        import_playlist: "Importer d'une autre app",
        import_playlist_desc: "Spotify, YouTube, etc.",
        created_in_app: "Créées dans l'app",
        empty_created: "Aucune playlist créée",
        imported_playlists: "Importées d'une autre app",
        empty_imported: "Aucune playlist importée",
        imported: "Importée"
      }
    },
    library: {
      tab_downloads: "Téléchargements"
    },
    offline: {
      title: "Musique téléchargée",
      subtitle: "Écoutez votre musique sans connexion internet ni données mobiles.",
      download_track: "Télécharger le morceau",
      remove_download: "Supprimer le téléchargement",
      download_playlist: "Télécharger la playlist",
      playlist_downloaded: "Playlist téléchargée",
      remove_playlist_downloads: "Supprimer les téléchargements de la playlist",
      downloading: "Téléchargement en cours...",
      download_success: "Morceau téléchargé pour écoute hors ligne",
      removed_success: "Téléchargement supprimé",
      empty_title: "Aucune musique téléchargée",
      empty_desc: "Téléchargez des titres depuis n'importe quelle playlist ou album pour les écouter hors ligne.",
      play_all: "Tout lire",
      shuffle: "Aléatoire",
      clear_all: "Supprimer tous les téléchargements",
      clear_all_confirm: "Supprimer tous les téléchargements ?",
      clear_all_confirm_desc: "Tous les morceaux téléchargés seront supprimés du stockage local.",
      search_placeholder: "Rechercher dans les téléchargements...",
      badge_offline: "Téléchargé"
    },
    player: {
      volume: "Volume",
      previous: "Morceau précédent",
      next: "Morceau suivant",
      repeat: "Répéter",
      open_player: "Ouvrir le lecteur"
    }
  },

  it: {
    common: {
      minimize: "Riduci a icona",
      maximize: "Ingrandisci",
      restore: "Ripristina",
      exitFullscreen: "Esci da schermo intero",
      song: "brano",
      songs: "brani",
      tracks_count: "brani",
      sidebar: {
        expand: "Espandi barra laterale",
        collapse: "Comprimi barra laterale",
        likes: "Brani preferiti",
        favorites: "Preferiti",
        create_playlist: "Crea playlist",
        create_playlist_desc: "Crea una lista da zero",
        import_playlist: "Importa da un'altra app",
        import_playlist_desc: "Spotify, YouTube, ecc.",
        created_in_app: "Create nell'app",
        empty_created: "Nessuna playlist creata",
        imported_playlists: "Importate da un'altra app",
        empty_imported: "Nessuna playlist importata",
        imported: "Importata"
      }
    },
    library: {
      tab_downloads: "Scaricati"
    },
    offline: {
      title: "Musica scaricata",
      subtitle: "Ascolta la tua musica senza connessione internet o consumo di dati.",
      download_track: "Scarica brano",
      remove_download: "Rimuovi download",
      download_playlist: "Scarica playlist",
      playlist_downloaded: "Playlist scaricata",
      remove_playlist_downloads: "Rimuovi download della playlist",
      downloading: "Download in corso...",
      download_success: "Brano scaricato per l'ascolto offline",
      removed_success: "Download rimosso",
      empty_title: "Nessuna musica scaricata",
      empty_desc: "Scarica brani da qualsiasi playlist o album per ascoltarli offline.",
      play_all: "Riproduci tutti",
      shuffle: "Riproduzione casuale",
      clear_all: "Elimina tutti i download",
      clear_all_confirm: "Eliminare tutti i download?",
      clear_all_confirm_desc: "Tutti i brani scaricati verranno rimossi dalla memoria del dispositivo.",
      search_placeholder: "Cerca nella musica scaricata...",
      badge_offline: "Scaricato"
    },
    player: {
      volume: "Volume",
      previous: "Brano precedente",
      next: "Brano successivo",
      repeat: "Ripeti",
      open_player: "Apri lettore"
    }
  },

  pl: {
    common: {
      minimize: "Minimalizuj",
      maximize: "Maksymalizuj",
      restore: "Przywróć",
      exitFullscreen: "Opuść pełny ekran",
      song: "utwór",
      songs: "utwory",
      tracks_count: "utwory",
      sidebar: {
        expand: "Rozwiń pasek boczny",
        collapse: "Zwiń pasek boczny",
        likes: "Polubione utwory",
        favorites: "Ulubione",
        create_playlist: "Utwórz playlistę",
        create_playlist_desc: "Stwórz listę od podstaw",
        import_playlist: "Importuj z innej aplikacji",
        import_playlist_desc: "Spotify, YouTube itp.",
        created_in_app: "Utworzone w aplikacji",
        empty_created: "Brak utworzonych playlist",
        imported_playlists: "Zaimportowane z innej aplikacji",
        empty_imported: "Brak zaimportowanych playlist",
        imported: "Zaimportowana"
      }
    },
    library: {
      tab_downloads: "Pobrane"
    },
    offline: {
      title: "Pobrana muzyka",
      subtitle: "Słuchaj muzyki bez połączenia z internetem i danych komórkowych.",
      download_track: "Pobierz utwór",
      remove_download: "Usuń pobrany utwór",
      download_playlist: "Pobierz playlistę",
      playlist_downloaded: "Playlista pobrana",
      remove_playlist_downloads: "Usuń pobrane z playlisty",
      downloading: "Pobieranie...",
      download_success: "Utwór pobrany do odtwarzania offline",
      removed_success: "Pobrany utwór usunięty",
      empty_title: "Brak pobranej muzyki",
      empty_desc: "Pobieraj utwory z playlist lub albumów, aby słuchać ich w trybie offline.",
      play_all: "Odtwórz wszystko",
      shuffle: "Losowo",
      clear_all: "Usuń wszystkie pobrane",
      clear_all_confirm: "Usunąć wszystkie pobrane?",
      clear_all_confirm_desc: "Wszystkie pobrane utwory zostaną usunięte z pamięci urządzenia.",
      search_placeholder: "Szukaj w pobranej muzyce...",
      badge_offline: "Pobrany"
    },
    player: {
      volume: "Głośność",
      previous: "Poprzedni utwór",
      next: "Następny utwór",
      repeat: "Powtarzaj",
      open_player: "Otwórz odtwarzacz"
    }
  },

  pt: {
    common: {
      minimize: "Minimizar",
      maximize: "Maximizar",
      restore: "Restaurar",
      exitFullscreen: "Sair da tela inteira",
      song: "música",
      songs: "músicas",
      tracks_count: "faixas",
      sidebar: {
        expand: "Expandir barra lateral",
        collapse: "Recolher barra lateral",
        likes: "Músicas curtidas",
        favorites: "Favoritos",
        create_playlist: "Criar playlist",
        create_playlist_desc: "Crie uma lista do zero",
        import_playlist: "Importar de outro app",
        import_playlist_desc: "Spotify, YouTube, etc.",
        created_in_app: "Criadas no app",
        empty_created: "Nenhuma playlist criada",
        imported_playlists: "Importadas de outro app",
        empty_imported: "Nenhuma playlist importada",
        imported: "Importada"
      }
    },
    library: {
      tab_downloads: "Downloads"
    },
    offline: {
      title: "Músicas baixadas",
      subtitle: "Ouça suas músicas sem conexão à internet ou consumo de dados móveis.",
      download_track: "Baixar música",
      remove_download: "Remover download",
      download_playlist: "Baixar playlist",
      playlist_downloaded: "Playlist baixada",
      remove_playlist_downloads: "Remover downloads da playlist",
      downloading: "Baixando...",
      download_success: "Música baixada para ouvir offline",
      removed_success: "Download removido",
      empty_title: "Nenhuma música baixada",
      empty_desc: "Baixe músicas de qualquer playlist ou álbum para ouvir offline quando quiser.",
      play_all: "Tocar tudo",
      shuffle: "Aleatório",
      clear_all: "Apagar todos os downloads",
      clear_all_confirm: "Apagar todos os downloads?",
      clear_all_confirm_desc: "Isso removerá todas as músicas baixadas do armazenamento deste dispositivo.",
      search_placeholder: "Buscar músicas baixadas...",
      badge_offline: "Baixada"
    },
    player: {
      volume: "Volume",
      previous: "Música anterior",
      next: "Próxima música",
      repeat: "Repetir",
      open_player: "Abrir reprodutor"
    }
  },

  ru: {
    common: {
      minimize: "Свернуть",
      maximize: "Развернуть",
      restore: "Восстановить",
      exitFullscreen: "Выйти из полноэкранного режима",
      song: "трек",
      songs: "треков",
      tracks_count: "треков",
      sidebar: {
        expand: "Развернуть панель",
        collapse: "Свернуть панель",
        likes: "Любимые треки",
        favorites: "Избранное",
        create_playlist: "Создать плейлист",
        create_playlist_desc: "Создать список с нуля",
        import_playlist: "Импорт из другого сервиса",
        import_playlist_desc: "Spotify, YouTube и др.",
        created_in_app: "Созданные в приложении",
        empty_created: "Нет созданных плейлистов",
        imported_playlists: "Импортированные",
        empty_imported: "Нет импортированных плейлистов",
        imported: "Импортирован"
      }
    },
    library: {
      tab_downloads: "Загрузки"
    },
    offline: {
      title: "Загруженная музыка",
      subtitle: "Слушайте музыку без подключения к интернету и расхода трафика.",
      download_track: "Скачать трек",
      remove_download: "Удалить загрузку",
      download_playlist: "Скачать плейлист",
      playlist_downloaded: "Плейлист скачан",
      remove_playlist_downloads: "Удалить скачанный плейлист",
      downloading: "Загрузка...",
      download_success: "Трек сохранен для прослушивания офлайн",
      removed_success: "Загрузка удалена",
      empty_title: "Нет загруженной музыки",
      empty_desc: "Загружайте треки из любых альбомов и плейлистов для прослушивания офлайн.",
      play_all: "Слушать всё",
      shuffle: "Вперемешку",
      clear_all: "Очистить все загрузки",
      clear_all_confirm: "Удалить все загрузки?",
      clear_all_confirm_desc: "Все сохраненные офлайн треки будут удалены с устройства.",
      search_placeholder: "Поиск среди загруженного...",
      badge_offline: "Загружено"
    },
    player: {
      volume: "Громкость",
      previous: "Предыдущий трек",
      next: "Следующий трек",
      repeat: "Повтор",
      open_player: "Открыть плеер"
    }
  },

  tr: {
    common: {
      minimize: "Küçült",
      maximize: "Büyüt",
      restore: "Geri yükle",
      exitFullscreen: "Tam ekrandan çık",
      song: "şarkı",
      songs: "şarkı",
      tracks_count: "parça",
      sidebar: {
        expand: "Kenar çubuğunu genişlet",
        collapse: "Kenar çubuğunu daralt",
        likes: "Beğenilen Şarkılar",
        favorites: "Favoriler",
        create_playlist: "Çalma listesi oluştur",
        create_playlist_desc: "Sıfırdan liste oluştur",
        import_playlist: "Başka uygulamadan aktar",
        import_playlist_desc: "Spotify, YouTube vb.",
        created_in_app: "Uygulamada oluşturulanlar",
        empty_created: "Henüz liste oluşturulmadı",
        imported_playlists: "Başka uygulamadan aktarılanlar",
        empty_imported: "Aktarılmış liste yok",
        imported: "Aktarıldı"
      }
    },
    library: {
      tab_downloads: "İndirilenler"
    },
    offline: {
      title: "İndirilen Müzikler",
      subtitle: "Müziklerinizi internet bağlantısı veya mobil veri olmadan dinleyin.",
      download_track: "Şarkıyı indir",
      remove_download: "İndirmeyi kaldır",
      download_playlist: "Listeyi indir",
      playlist_downloaded: "Liste indirildi",
      remove_playlist_downloads: "Listedeki indirmeleri kaldır",
      downloading: "İndiriliyor...",
      download_success: "Şarkı çevrimdışı dinleme için indirildi",
      removed_success: "İndirme kaldırıldı",
      empty_title: "İndirilen müzik yok",
      empty_desc: "Çevrimdışı dinlemek için herhangi bir çalma listesinden veya albümden şarkı indirin.",
      play_all: "Tümünü çal",
      shuffle: "Karışık",
      clear_all: "Tüm indirmeleri sil",
      clear_all_confirm: "Tüm indirmeler silinsin mi?",
      clear_all_confirm_desc: "Bu işlem indirilen tüm şarkıları bu cihazdan kaldıracaktır.",
      search_placeholder: "İndirilen müziklerde ara...",
      badge_offline: "İndirildi"
    },
    player: {
      volume: "Ses seviyesi",
      previous: "Önceki parça",
      next: "Sonraki parça",
      repeat: "Tekrarla",
      open_player: "Oynatıcıyı aç"
    }
  },

  uk: {
    common: {
      minimize: "Згорнути",
      maximize: "Розгорнути",
      restore: "Відновити",
      exitFullscreen: "Вийти з повноекранного режиму",
      song: "трек",
      songs: "треків",
      tracks_count: "треків",
      sidebar: {
        expand: "Розгорнути панель",
        collapse: "Згорнути панель",
        likes: "Улюблені треки",
        favorites: "Вибране",
        create_playlist: "Створити плейліст",
        create_playlist_desc: "Створити список з нуля",
        import_playlist: "Імпорт з іншого додатку",
        import_playlist_desc: "Spotify, YouTube тощо",
        created_in_app: "Створені в додатку",
        empty_created: "Немає створених плейлістів",
        imported_playlists: "Імпортовані плейлісти",
        empty_imported: "Немає імпортованих плейлістів",
        imported: "Імпортовано"
      }
    },
    library: {
      tab_downloads: "Завантаження"
    },
    offline: {
      title: "Завантажена музика",
      subtitle: "Слухайте музику без доступу до інтернету та витрати мобільних даних.",
      download_track: "Завантажити трек",
      remove_download: "Видалити завантаження",
      download_playlist: "Завантажити плейліст",
      playlist_downloaded: "Плейліст завантажено",
      remove_playlist_downloads: "Видалити завантаження з плейліста",
      downloading: "Завантаження...",
      download_success: "Трек збережено для прослуховування офлайн",
      removed_success: "Завантаження видалено",
      empty_title: "Немає завантаженої музики",
      empty_desc: "Завантажуйте треки з будь-яких плейлістів або альбомів для офлайн прослуховування.",
      play_all: "Грати все",
      shuffle: "Перемішати",
      clear_all: "Очистити всі завантаження",
      clear_all_confirm: "Видалити всі завантаження?",
      clear_all_confirm_desc: "Всі збережені офлайн треки будуть видалені з цього пристрою.",
      search_placeholder: "Пошук серед завантаженого...",
      badge_offline: "Завантажено"
    },
    player: {
      volume: "Гучність",
      previous: "Попередній трек",
      next: "Наступний трек",
      repeat: "Повтор",
      open_player: "Відкрити плеєр"
    }
  }
};

// 1. Load each locale
const parsed = {};
for (const loc of locales) {
  const filePath = path.join(localesDir, `${loc}.json`);
  parsed[loc] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// 2. Apply additions
for (const loc of locales) {
  if (additions[loc]) {
    deepMerge(parsed[loc], additions[loc]);
  }
}

// 3. Ensure discord & shortcuts sections from EN exist in DE, FR, IT, PL, TR if missing
const enShortcuts = parsed.en.settings?.shortcuts || {};
const enDiscord = parsed.en.settings?.discord || {};
const enMiniplayer = parsed.en.settings?.miniplayer || additions.en.settings.miniplayer;

for (const loc of locales) {
  if (!parsed[loc].settings) parsed[loc].settings = {};
  if (!parsed[loc].settings.shortcuts) {
    parsed[loc].settings.shortcuts = JSON.parse(JSON.stringify(enShortcuts));
  } else {
    deepMerge(parsed[loc].settings.shortcuts, enShortcuts);
  }

  if (!parsed[loc].settings.discord) {
    parsed[loc].settings.discord = JSON.parse(JSON.stringify(enDiscord));
  } else {
    deepMerge(parsed[loc].settings.discord, enDiscord);
  }

  if (!parsed[loc].settings.miniplayer) {
    parsed[loc].settings.miniplayer = JSON.parse(JSON.stringify(enMiniplayer));
  } else {
    deepMerge(parsed[loc].settings.miniplayer, enMiniplayer);
  }

  // Ensure offline section
  if (!parsed[loc].offline) {
    parsed[loc].offline = JSON.parse(JSON.stringify(additions[loc]?.offline || additions.en.offline));
  } else {
    deepMerge(parsed[loc].offline, additions[loc]?.offline || additions.en.offline);
  }

  // Ensure common.sidebar
  if (!parsed[loc].common) parsed[loc].common = {};
  if (!parsed[loc].common.sidebar) {
    parsed[loc].common.sidebar = JSON.parse(JSON.stringify(additions[loc]?.common?.sidebar || additions.en.common.sidebar));
  } else {
    deepMerge(parsed[loc].common.sidebar, additions[loc]?.common?.sidebar || additions.en.common.sidebar);
  }

  // Ensure library.tab_downloads
  if (!parsed[loc].library) parsed[loc].library = {};
  if (!parsed[loc].library.tab_downloads) {
    parsed[loc].library.tab_downloads = additions[loc]?.library?.tab_downloads || "Downloads";
  }

  // Ensure common minimize/maximize
  deepMerge(parsed[loc].common, additions[loc]?.common || additions.en.common);

  // Fallback any remaining missing keys from EN
  deepMerge(parsed[loc], parsed.en);
}

// 4. Save back all files sorted and formatted
for (const loc of locales) {
  const filePath = path.join(localesDir, `${loc}.json`);
  fs.writeFileSync(filePath, JSON.stringify(parsed[loc], null, 2) + '\n', 'utf8');
  console.log(`Saved ${loc}.json`);
}

console.log('All locales synchronized successfully!');
