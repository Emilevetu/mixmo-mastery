# Supabase Edge Functions

Ces fonctions doivent être déployées séparément sur Supabase.

## Déploiement des fonctions

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier le projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer toutes les fonctions
supabase functions deploy

# Ou déployer une fonction spécifique
supabase functions deploy create-room
supabase functions deploy start-game
supabase functions deploy mixmo
```

## Fonctions disponibles

- `create-room` : Créer une nouvelle salle de jeu
- `start-game` : Démarrer une partie
- `mixmo` : Effectuer un MIXMO (mélange des lettres)

## Configuration requise

Assurez-vous que votre projet Supabase a :
- Les tables nécessaires créées via les migrations
- Les Edge Functions activées
- Les bonnes permissions RLS configurées
