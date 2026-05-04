/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#11181C",
    textMuted: "#687076",
    background: "#FAFAFA",
    border: "#E5E5E5",
    tint: "#007C52",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelectedBackground: "#022C22",
    tabIconSelectedForeground: "#ECFDF5",
    tabBarBackground: "#FFFFFFBF",
    tabBarBorder: "#F5F5F5",
    shadow: "#F5F5F5",
  },
  dark: {
    text: "#ECEDEE",
    textMuted: "#9BA1A6",
    background: "#151718",
    border: "#2D3748",
    tint: "#FFFFFF",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelectedBackground: "#FFFFFF",
    tabIconSelectedForeground: "#ECFDF5",
    tabBarBackground: "#000000BF",
    tabBarBorder: "#2D3748",
    shadow: "#1A1A1A",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
