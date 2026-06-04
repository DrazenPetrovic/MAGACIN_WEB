# Koraci za pravljenje APK fajla

## Brza komanda (sve u jednom)

```powershell
npm run build && npx cap sync android && cd android && .\gradlew.bat assembleDebug
```

## APK lokacija nakon builda

```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Korak po korak

### 1. Build web aplikacije
```powershell
npm run build
```

### 2. Sync sa Android projektom
```powershell
npx cap sync android
```

### 3. Napravi APK
```powershell
cd android
.\gradlew.bat assembleDebug
```

### 4. Vrati se u root folder
```powershell
cd ..
```

---

## Instalacija na tabletu

1. Kopiraj `app-debug.apk` na tablet (USB ili Google Drive)
2. Na tabletu: **Podešavanja** → **Sigurnost** → Uključi **Nepoznati izvori**
3. Otvori APK i instaliraj

---

## Napomene

- **Debug APK** — za testiranje, nema potrebe za potpisom
- **Release APK** (optimizovaniji, za produkciju):
  ```powershell
  npm run build && npx cap sync android && cd android && .\gradlew.bat assembleRelease
  ```
  Lokacija: `android\app\build\outputs\apk\release\app-release-unsigned.apk`

- Ako Gradle prijavi grešku, očisti cache:
  ```powershell
  cd android && .\gradlew.bat clean && .\gradlew.bat assembleDebug
  ```
