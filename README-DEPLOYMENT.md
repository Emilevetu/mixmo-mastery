# Déploiement sur Render

## Configuration requise

### Variables d'environnement
Vous devez configurer les variables d'environnement suivantes dans Render :

- `VITE_SUPABASE_URL` : URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` : Clé anonyme de votre projet Supabase
- `NODE_ENV` : production

### Configuration Render

1. **Type de service** : Web Service
2. **Environnement** : Node
3. **Plan** : Free (ou plus selon vos besoins)
4. **Build Command** : `npm install && npm run build`
5. **Start Command** : `npm start`
6. **Port** : Render définit automatiquement le port via la variable `$PORT`

### Étapes de déploiement

1. Connectez votre repository GitHub à Render
2. Sélectionnez ce repository
3. Configurez les variables d'environnement
4. Déployez !

### Notes importantes

- Le build utilise Vite pour créer les fichiers statiques
- Le serveur de preview de Vite sert les fichiers en production
- Assurez-vous que votre base de données Supabase est accessible publiquement
- Les Edge Functions Supabase doivent être déployées séparément

### Vérification du déploiement

Une fois déployé, votre application sera accessible via l'URL fournie par Render.
Vérifiez que :
- La page d'accueil se charge
- L'authentification fonctionne
- Les parties peuvent être créées et rejointes
- Le jeu fonctionne correctement
