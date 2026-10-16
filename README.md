# Arène — jeux entre potes
Lancer : `cd /workspace/jeux && node server.js` (port 3000, PORT=… pour changer).
Données : data.db (SQLite via sql.js), secret de session : .secret
Tests : `node test.js` (2 comptes, message, défi + match en ligne simulé), `node shot.js` (captures dans screens/).
Ajouter un jeu : nouvelle tuile dans pageJeux() (public/app.js) + dossier public/game/.
