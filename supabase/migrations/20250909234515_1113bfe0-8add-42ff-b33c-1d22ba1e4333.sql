-- Supprimer l'ancienne contrainte unique qui cause le problème
ALTER TABLE board_tiles DROP CONSTRAINT IF EXISTS board_tiles_room_id_x_y_key;

-- Ajouter une nouvelle contrainte unique qui inclut user_id
-- Cela permet à chaque joueur d'avoir ses propres coordonnées
ALTER TABLE board_tiles ADD CONSTRAINT board_tiles_room_id_user_id_x_y_key 
UNIQUE (room_id, user_id, x, y);