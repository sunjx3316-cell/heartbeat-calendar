const crypto = require('crypto');

const pair = crypto.createECDH('prime256v1');
pair.generateKeys();

console.log('VAPID_PUBLIC_KEY=' + pair.getPublicKey().toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + pair.getPrivateKey().toString('base64url'));
console.log('VAPID_SUBJECT=mailto:your-email@example.com');
console.log('\nKeep the private key secret. Store all three values only in CloudBase function environment variables.');
