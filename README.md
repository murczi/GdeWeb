# TTS kiegészítések

Ez a dokumentum a szövegfelolvasás (Text-to-Speech) bővítéseit foglalja össze a projektben: milyen végpont készült az API-ban, hogyan hívja azt a front-end, és hol érhető el a felhasználói felület a felolvasáshoz.

## Backend (GdeWebAPI)
- Új végpont: `POST /api/audio/tts` (`GdeWebAPI/Controllers/AudioController.cs`), `audio/mpeg` választ ad.
- Hitelesítés: `AccessToken` fejléc kötelező, ugyanaz a token, mint a többi hívásnál.
- Kérés: `multipart/form-data` mezők
  - `text` (kötelező): a felolvasandó szöveg.
  - `voice` (nem kötelező): OpenAI TTS hang (alapértelmezett: `Nova`). Elfogadja a `CreateSpeechRequestVoice` enum értékeit: például `Alloy`, `Shimmer`, `Echo`, `Fable`, `Onyx`.
  - `speed` (nem kötelező): 0.5–2.0 közötti tempó (alap: `1.0`).
- Implementáció: OpenAI `tts-1` modell, `mp3` formátum, a `tryAGI.OpenAI` kliensen keresztül.
- Konfiguráció: `OpenAI:ApiKey` az `appsettings.*` fájlban kötelező. Ha hiányzik, a controller induláskor hibát dob.
- Válaszok: 401 token hiány esetén, 400 üres szövegre, egyéb hibák esetén megfelelő státuszkód.

## Frontend integráció (GdeWeb)
- Globális JS modul: `wwwroot/js/speechEvents.js`
  - `window.tts.playBase64(apiUrl, accessToken, text, options)` hívja az API-t, létrehozza az audio elemet, lejátssza az mp3-at.
  - `options`: `voice`, `speed`, `subtitleSelector` (CSS-szelektor a feliratkijelzéshez).
  - Automatikus mondatra bontás és időzítés (karakterszám arányos, nincs valódi időbélyeg), aktív mondat kiemelése görgetéssel.
  - `window.tts.stop()` leállítja a lejátszást, törli az eseménykezelőket és az ObjectURL-t.
- Blazor wrapper: `Components/Layout/MainLayout.razor`
  - `PlayTtsAsync(text, voice = "nova", speed = 1.0, subtitleSelector = null)` lekéri a `token` értéket a `localStorage`-ból, és továbbítja a JS modulnak.
  - `StopTtsAsync()` a lejátszás megállítására.

## UI funkciók
- Kurzus nézet: `Dialogs/CourseViewDialog.razor`
  - „Hangos felolvasás” gomb, hangszínválasztó (`Nova/Alloy/Shimmer/Echo/Fable/Onyx`), tempó csúszka.
  - Szinkronizált mondat-kiemelés a `#course-subtitle-chunks` konténerben.
- Kvíz: `Components/Cards/QuizCard.razor`
  - A kérdések automatikus felolvasása a játék indításakor és kérdésváltáskor, ha a hangok engedélyezve vannak.

## Gyors kipróbálás
- API hívás terminálból:
  ```bash
  curl -X POST "https://<apiUrl>/api/audio/tts" \
    -H "AccessToken: <token>" \
    -F "text=Teszt felolvasás" \
    -F "voice=Nova" \
    -F "speed=1.0" \
    --output output.mp3
  ```
  Az `output.mp3` lokálisan lejátszható, így ellenőrizhető a TTS.
- UI-ban: nyiss meg egy kurzust, kattints a „Hangos felolvasás” gombra, válassz hangszínt/tempót, a mondatok a lejátszás közben kiemelve követik a hangot. Kvízben a kérdések automatikusan felolvasásra kerülnek.


## Diakok:
  - Alter Marcell - PYMQAG  
  - Simon Armin - FTP30P
  - Varga Zoltan - UBRK9A
  - Pitner Alexandra - JZ1D6D
  -Dudas Norbert - I22BZY
