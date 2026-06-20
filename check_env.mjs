import dotenv from 'dotenv';
dotenv.config();

console.log(Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE') || k.includes('SUPA')));
