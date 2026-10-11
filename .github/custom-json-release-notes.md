**Jan Custom json** ist ein Build von Jan mit eigenem Request-JSON pro Modell.

## Neu: eigenes Request-JSON pro Modell

Über den `{ }`-Button im Chat-Eingabefeld kann für das gewählte Modell ein beliebiges JSON-Objekt hinterlegt werden. Es wird in jede Chat-Anfrage an dieses Modell eingemischt, nach Jans eigenen Parametern, und überschreibt diese.

Beispiel: Thinking für Qwen 3.6 MoE (vLLM, SGLang, LM Studio, entfernter llama-server) abschalten:

```json
{ "chat_template_kwargs": { "enable_thinking": false } }
```

- Für Anbieter ohne eigenen Reasoning-Schalter gibt es eine Schnellwahl **Thinking: Standard / An / Aus**.
- Ein Schalter deaktiviert das JSON, ohne es zu löschen.
- Der Editor steht auch in den Modell-Einstellungen.

## Hinweise

- **Eigenständige App:** läuft neben einer offiziellen Jan-Installation, mit eigenem Datenordner (`Jan-Custom-json`). Modelle und Chats aus Jan sind nicht automatisch da. Unter *Einstellungen → Allgemein* lässt sich der Datenordner bei Bedarf umstellen.
- **Kein Auto-Update:** die App aktualisiert sich nicht selbst. Neue Versionen gibt es hier unter Releases.
- **Nicht signiert:**
  - macOS: nach dem Kopieren nach *Programme* einmal `xattr -cr "/Applications/Jan Custom json.app"` im Terminal ausführen, sonst meldet macOS die App als beschädigt.
  - Windows: SmartScreen warnt beim ersten Start; über *Weitere Informationen → Trotzdem ausführen* starten.
- **Linux:** das `.deb` kollidiert mit einem installierten offiziellen Jan-`.deb`. Für beides nebeneinander das AppImage verwenden.
- Lokale Modelle laufen unter Windows und Linux über Vulkan, unter macOS über Metal.
