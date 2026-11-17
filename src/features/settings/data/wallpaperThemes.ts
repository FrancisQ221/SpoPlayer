import cosmosBg from "@/assets/wallpapers/cosmos.jpg";
import nebulaBg from "@/assets/wallpapers/nebula.jpg";
import initialDBg from "@/assets/wallpapers/initial-d.jpg";
import neoTokyoBg from "@/assets/wallpapers/neo-tokyo.jpg";

export interface WallpaperTheme {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  accentColor: string;
  gradient: [string, string];
  recommendedDim: number;
  recommendedBlur: number;
}

export const WALLPAPER_THEMES: WallpaperTheme[] = [
  {
    id: "cosmos",
    name: "Cosmos",
    subtitle: "Vía Láctea & Cielo Estelar",
    image: cosmosBg,
    accentColor: "#F5A623",
    gradient: ["#F5A623", "#D97706"],
    recommendedDim: 15,
    recommendedBlur: 0,
  },
  {
    id: "nebula",
    name: "Nébula",
    subtitle: "Anillos Planetarios & Polvo Cósmico",
    image: nebulaBg,
    accentColor: "#F43F5E",
    gradient: ["#F43F5E", "#BE123C"],
    recommendedDim: 18,
    recommendedBlur: 0,
  },
  {
    id: "initial-d",
    name: "Initial D",
    subtitle: "AE86 Drifting • Manga 1-Bit",
    image: initialDBg,
    accentColor: "#E8E2D8",
    gradient: ["#FFFFFF", "#D1D5DB"],
    recommendedDim: 20,
    recommendedBlur: 0,
  },
  {
    id: "neo-tokyo",
    name: "Neo Tokyo",
    subtitle: "Atardecer Cyberpunk & Linternas",
    image: neoTokyoBg,
    accentColor: "#FF3B30",
    gradient: ["#FF3B30", "#DC2626"],
    recommendedDim: 15,
    recommendedBlur: 0,
  },
];
