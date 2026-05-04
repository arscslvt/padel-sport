/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#11181C",
    textTinted: "#022C22",
    textMuted: "#687076",
    background: "#FAFAFA",
    muted: "#f5f5f5",
    elevated: "#FFFFFF",
    border: "#E5E5E5",
    tint: "#007C52",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelectedBackground: "#022C22",
    tabIconSelectedForeground: "#ECFDF5",
    tabBarBackground: "#FFFFFFBF",
    tabBarBorder: "#F5F5F5",
    shadow: "#e5e5e5",
  },
  dark: {
    text: "#ECEDEE",
    textTinted: "#022C22",
    textMuted: "#9BA1A6",
    background: "#171717",
    muted: "#2D3748",
    elevated: "#262626",
    border: "#40404080",
    tint: "#FFFFFF",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelectedBackground: "#ecfdf5",
    tabIconSelectedForeground: "#022c22",
    tabBarBackground: "#262626BF",
    tabBarBorder: "#40404080",
    shadow: "#151718",
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
