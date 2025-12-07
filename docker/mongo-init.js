// MongoDB initialization script for Docker
db = db.getSiblingDB('social_network');

db.createUser({
  user: 'admin',
  pwd: 'admin123',
  roles: [
    {
      role: 'readWrite',
      db: 'social_network'
    }
  ]
});

print('MongoDB initialization completed for social_network database');