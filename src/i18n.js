// Yandex Games 2.14: read environment.i18n.lang at boot. UI is Russian-only.
export const FALLBACK_LANG='ru';
export const SUPPORTED_LANGS=['ru'];

export function readSdkLang(sdk){
 let lang=FALLBACK_LANG;
 try{lang=String(sdk.environment.i18n.lang||FALLBACK_LANG).toLowerCase();}catch{}
 return lang;
}

export function resolveUiLang(sdkLang){
 const code=(sdkLang||FALLBACK_LANG).slice(0,2);
 return SUPPORTED_LANGS.includes(code)?code:FALLBACK_LANG;
}

export function applyLanguage(sdkLang){
 const ui=resolveUiLang(sdkLang);
 if(typeof document!=='undefined'){
  document.documentElement.lang=ui;
  document.documentElement.setAttribute('data-sdk-lang',sdkLang||ui);
 }
 return ui;
}
