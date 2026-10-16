Ambient audio / صدای محیطی
==========================
Optional. Put a looping track here (e.g. ambient.mp3) and set its path in data/projects.json:

  "settings": { "ambientAudio": { "src": "assets/audio/ambient.mp3", "label": "موسیقی محیطی" } }

Audio never plays automatically and is off by default. The speaker button in the header
starts and stops it. If the file is missing, a message appears and the button stays off.

Format: mp3 or ogg, short seamless loop, under 3 MB. Naming: ambient.mp3.
