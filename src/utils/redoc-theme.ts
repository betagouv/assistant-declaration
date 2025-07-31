import { ThemeInterface } from 'redoc/typings/theme';

//
//
// Using `cssVar('--text-label-blue-france')` was randomly working since it fetches the raw value at runtime
// and most of the time it was triggering an error due to not finding it.
// Also since harcoding the value switching the website theme did not change the redoc appearence, we have to have 2 different themes
// ... so we decided having raw values in a factory
//
//

export function dsfrTheme(isDark: boolean): ThemeInterface {
  // Default values can be found inside https://github.com/Redocly/redoc/blob/main/src/theme.ts
  return {
    spacing: {},
    breakpoints: {},
    colors: {
      primary: {
        main: isDark ? '#8585f6' : '#000091', // --text-label-blue-france
        contrastText: isDark ? '#000091' : '#f5f5fe', // --text-inverted-blue-france
      },
      success: {
        main: isDark ? '#27a658' : '#18753c', // --text-default-success
        contrastText: isDark ? '#142117' : '#dffee6', // --text-inverted-success
      },
      warning: {
        main: isDark ? '#fc5d00' : '#b34000', // --text-default-warning
        contrastText: isDark ? '#2d1814' : '#fff4f3', // --text-inverted-warning
      },
      error: {
        main: isDark ? '#ff5655' : '#ce0500', // --text-default-error
        contrastText: isDark ? '#301717' : '#fff4f4', // --text-inverted-error
      },
      gray: {
        50: isDark ? '#161616' : '#ffffff', // --text-inverted-grey
        100: isDark ? '#343434' : '#f6f6f6', // --background-default-grey-hover
      },
      text: {
        primary: isDark ? '#cecece' : '#3a3a3a', // --text-default-grey
        secondary: isDark ? '#ffffff' : '#161616', // --text-label-grey
      },
      border: {
        dark: isDark ? '#ffffff' : '#161616', // --border-action-high-grey
        light: isDark ? '#353535' : '#dddddd', // --border-default-grey
      },
      responses: {},
      http: {
        get: isDark ? '#99c221' : '#447049', // --border-plain-green-bourgeon
        post: isDark ? '#7ab1e8' : '#3558a2', // --border-plain-blue-cumulus
        put: isDark ? '#ce70cc' : '#6e445a', // --border-plain-purple-glycine
        options: isDark ? '#ffb7ae' : '#8d533e', // --border-plain-pink-macaron
        patch: isDark ? '#fc5d00' : '#b34000', // --border-plain-warning
        delete: isDark ? '#f95c5e' : '#c9191e', // --border-plain-red-marianne
        basic: isDark ? '#d0c3b7' : '#6a6156', // --border-plain-beige-gris-galet
        link: isDark ? '#34bab5' : '#006a6f', // --border-plain-green-archipel
        head: isDark ? '#ff9575' : '#a94645', // --border-plain-pink-tuile
      },
    },
    schema: {
      nestedBackground: isDark ? '#1e1e1e' : '#f6f6f6', // --background-alt-grey
      arrow: {
        color: isDark ? '#ffffff' : '#161616', // --text-action-high-grey
      },
    },
    typography: {
      fontFamily: 'Marianne, arial, sans-serif',
      headings: {
        fontFamily: 'Marianne, arial, sans-serif',
        fontWeight: '600',
      },
      code: {
        fontFamily: 'Courier, monospace',
        color: isDark ? '#7ab1e8' : '#3558a2', // --text-label-blue-cumulus
        backgroundColor: isDark ? '#242424' : '#eeeeee', // --background-contrast-grey
      },
      links: {},
    },
    sidebar: {
      backgroundColor: isDark ? '#161616' : '#ffffff', // --background-default-grey
      textColor: isDark ? '#ffffff' : '#161616', // --text-action-high-grey
      groupItems: {},
      level1Items: {},
      arrow: {
        color: isDark ? '#ffffff' : '#161616', // --text-action-high-grey
      },
    },
    logo: {},
    rightPanel: {
      backgroundColor: isDark ? '#1e1e1e' : '#3a3a3a', // --background-alt-grey / --background-flat-grey
      // [IMPORTANT] As stated below inside `codeBlock` we have to keep a dark right panel for everything to be readable
      // So we need a dark color on the dark theme too...
      //
      // backgroundColor: isDark ? '#1e1e1e' : '#f6f6f6', // --background-alt-grey
      // textColor: isDark ? '#cecece' : '#3a3a3a', // --text-default-grey
      // servers: {
      //   overlay: {},
      //   url: {},
      // },
    },
    codeBlock: {
      // [IMPORTANT] It seems tokens are modifiable for the paid version but not in the community version
      // so we have to keep a "dark" right panel so hardcoded colors will be readable
      //
      // backgroundColor: isDark ? '#242424' : '#eeeeee', // --background-contrast-grey
      // ...{
      //   tokens: {
      //     comment { color: isDark ? '#' : '#' },
      //     prolog: { color: isDark ? '#' : '#' },
      //     doctype: { color: isDark ? '#' : '#' },
      //     cdata: { color: isDark ? '#' : '#' },
      //     punctuation: { color: isDark ? '#' : '#' },
      //     property: { color: isDark ? '#' : '#' },
      //     tag: { color: isDark ? '#' : '#' },
      //     number: { color: isDark ? '#' : '#' },
      //     constant: { color: isDark ? '#' : '#' },
      //     symbol: { color: isDark ? '#' : '#' },
      //     boolean: { color: isDark ? '#' : '#' },
      //     selector: { color: isDark ? '#' : '#' },
      //     string: { color: isDark ? '#' : '#' },
      //     char: { color: isDark ? '#' : '#' },
      //     builtin: { color: isDark ? '#' : '#' },
      //     inserted: { color: isDark ? '#' : '#' },
      //     operator: { color: isDark ? '#' : '#' },
      //     entity: { color: isDark ? '#' : '#' },
      //     url: { color: isDark ? '#' : '#' },
      //     variable: { color: isDark ? '#' : '#' },
      //     atrule: { color: isDark ? '#' : '#' },
      //     keyword: { color: isDark ? '#' : '#' },
      //     regex: { color: isDark ? '#' : '#' },
      //     important: { color: isDark ? '#' : '#' },
      //     bold: { color: isDark ? '#' : '#' },
      //     italic: { color: isDark ? '#' : '#' },
      //     entity: { color: isDark ? '#' : '#' },
      //     deleted: { color: isDark ? '#' : '#' },
      //   },
      // },
    },
    fab: {
      backgroundColor: isDark ? '#161616' : '#ffffff', // --background-default-grey
      color: isDark ? '#518fff' : '#0063cb', // --text-default-info
    },
    // Add to do this because the type are not recognized (despite it works well)
    ...({
      extensionsHook: (c: any) => {
        if (c === 'UnderlinedHeader') {
          return {
            color: isDark ? '#ffffff' : '#161616', // --text-title-grey
            borderBottom: isDark ? '#ffffff' : '#161616', // --border-action-high-grey
          };
        }

        // TODO: unfortunately there is no hook on `MimeLabel` to adjust color, and the class name is random so it cannot be patched easily
      },
    } as any),
  };
}
