# Guide de déploiement - Mixmo Mastery

## 🚀 Déploiement sur Render

### Prérequis
1. Un compte Render (gratuit)
2. Un projet Supabase configuré
3. Votre code sur GitHub

### Étapes de déploiement

#### 1. Préparation du repository
- ✅ Tous les fichiers de configuration sont prêts
- ✅ Le build fonctionne localement
- ✅ Les variables d'environnement sont documentées

#### 2. Configuration Render

1. **Connectez-vous à Render** : https://render.com
2. **Créez un nouveau Web Service**
3. **Connectez votre repository GitHub**
4. **Configurez le service** :
   - **Name** : `mixmo-mastery`
   - **Environment** : `Node`
   - **Plan** : `Free` (ou plus selon vos besoins)
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Node Version** : `18` (ou plus récent)

#### 3. Variables d'environnement

Ajoutez ces variables dans Render :

```
NODE_ENV=production
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anonyme_supabase
```

#### 4. Déploiement des Edge Functions Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer les fonctions
supabase functions deploy
```

#### 5. Vérification

Une fois déployé, vérifiez que :
- ✅ La page d'accueil se charge
- ✅ L'authentification fonctionne
- ✅ Les parties peuvent être créées
- ✅ Le jeu fonctionne correctement
- ✅ L'agrandissement de grille fonctionne

### 🔧 Configuration avancée

#### Variables d'environnement supplémentaires
Si nécessaire, vous pouvez ajouter :
```
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
```

#### Optimisations de performance
- Le build utilise esbuild pour la minification
- Les chunks sont optimisés pour le cache
- Les assets sont compressés avec gzip

### 🐛 Dépannage

#### Problèmes courants

1. **Build échoue** :
   - Vérifiez que toutes les dépendances sont dans `package.json`
   - Assurez-vous que Node.js 18+ est utilisé

2. **Variables d'environnement** :
   - Vérifiez que les clés Supabase sont correctes
   - Assurez-vous que l'URL Supabase est accessible

3. **Edge Functions** :
   - Vérifiez que les fonctions sont déployées
   - Contrôlez les logs dans Supabase Dashboard

### 📊 Monitoring

- **Logs Render** : Accessibles dans le dashboard Render
- **Logs Supabase** : Dans le dashboard Supabase > Functions
- **Métriques** : Disponibles dans le plan payant de Render

### 🔄 Mise à jour

Pour mettre à jour l'application :
1. Poussez les changements sur GitHub
2. Render déploiera automatiquement
3. Redéployez les Edge Functions si nécessaire

### 💰 Coûts

- **Plan Free Render** : Gratuit avec limitations
- **Supabase** : Plan gratuit généreux
- **Total** : Gratuit pour commencer !

---

**Bon déploiement ! 🎮**
