import { createTheme, alpha, type Theme, type SxProps } from "@mui/material/styles";

// ---------- shared color constants ----------
export const UI_COLORS = {
  white: "#ffffff",
  black: "#000000",
  primary: "#1d37fc",
  textSecondary: "#7d7d7d",
  textTertiary: "rgba(201, 209, 217, 0.64)",
  surfaceElevated: "#161b22",
  surfaceTooltip: "rgba(30, 30, 30, 0.95)",
} as const;

export const STATUS_COLORS = {
  merged: "#3fb950",
  open: alpha(UI_COLORS.white, 0.6),
  closed: "#ff7b72",
  neutral: "#9ca3af",
  success: "#4ade80",
  warning: "#f59e0b",
  warningOrange: "#fb923c",
  error: "#ef4444",
  info: "#58a6ff",
} as const;

export const DIFF_COLORS = {
  additions: "#7ee787",
  deletions: "#ef4444",
} as const;

export const scrollbarSx = {
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  },
} as const;

export const headerCellStyle: SxProps<Theme> = {
  backgroundColor: "surface.tooltip",
  backdropFilter: "blur(8px)",
  color: "text.secondary",
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: "0.75rem",
  borderBottom: "1px solid",
  borderColor: "border.light",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  py: 1.5,
};

// ---------- MUI module augmentation ----------
declare module "@mui/material/styles" {
  interface TypeText {
    tertiary: string;
  }

  interface TypographyVariants {
    mono: React.CSSProperties;
    monoSmall: React.CSSProperties;
    sectionTitle: React.CSSProperties;
    statValue: React.CSSProperties;
    statLabel: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
    monoSmall?: React.CSSProperties;
    sectionTitle?: React.CSSProperties;
    statValue?: React.CSSProperties;
    statLabel?: React.CSSProperties;
  }

  interface Palette {
    status: {
      merged: string;
      open: string;
      closed: string;
      neutral: string;
      success: string;
      warning: string;
      warningOrange: string;
      error: string;
      info: string;
    };
    diff: { additions: string; deletions: string };
    border: { subtle: string; light: string; medium: string };
    surface: {
      transparent: string;
      subtle: string;
      light: string;
      elevated: string;
      tooltip: string;
    };
  }

  interface PaletteOptions {
    status?: Palette["status"];
    diff?: Palette["diff"];
    border?: Palette["border"];
    surface?: Palette["surface"];
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
    monoSmall: true;
    sectionTitle: true;
    statValue: true;
    statLabel: true;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsVariantOverrides {
    status: true;
    info: true;
  }
}

// ---------- theme ----------
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: UI_COLORS.primary },
    secondary: { main: "#fff30d" },
    background: { default: UI_COLORS.black, paper: "#0a0f1f" },
    text: {
      primary: UI_COLORS.white,
      secondary: UI_COLORS.textSecondary,
      tertiary: UI_COLORS.textTertiary,
    },
    divider: alpha(UI_COLORS.white, 0.1),
    status: { ...STATUS_COLORS },
    diff: { ...DIFF_COLORS },
    border: {
      subtle: alpha(UI_COLORS.white, 0.08),
      light: alpha(UI_COLORS.white, 0.1),
      medium: alpha(UI_COLORS.white, 0.2),
    },
    surface: {
      transparent: "transparent",
      subtle: alpha(UI_COLORS.white, 0.02),
      light: alpha(UI_COLORS.white, 0.05),
      elevated: UI_COLORS.surfaceElevated,
      tooltip: UI_COLORS.surfaceTooltip,
    },
  },
  typography: {
    fontFamily: '"JetBrains Mono", monospace',
    mono: { fontWeight: 500 },
    monoSmall: {
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    },
    sectionTitle: { fontSize: "1rem", fontWeight: 600, color: "#fff" },
    statValue: { fontSize: "1.1rem", fontWeight: 600, color: "#fff" },
    statLabel: {
      fontSize: "0.7rem",
      fontWeight: 500,
      textTransform: "uppercase",
      color: "rgba(255, 255, 255, 0.4)",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: '"JetBrains Mono", monospace' },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${alpha(UI_COLORS.white, 0.1)}`,
          backgroundColor: "transparent",
        },
      },
    },
    MuiChip: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.75rem",
          fontWeight: 600,
          borderRadius: 6,
          height: 24,
        },
      },
      variants: [
        {
          props: { variant: "status" },
          style: { backgroundColor: "transparent", border: "1px solid", borderRadius: 6 },
        },
        {
          props: { variant: "info" },
          style: ({ theme: t }) => ({
            backgroundColor: t.palette.surface.light,
            border: `1px solid ${t.palette.border.light}`,
            color: t.palette.text.primary,
            borderRadius: 6,
          }),
        },
      ],
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
