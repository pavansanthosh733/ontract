FROM node:20-alpine AS builder
WORKDIR /app

# Vite reads VITE_* at BUILD time → must be passed as build args
ARG VITE_BACKEND_URL
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_VAPID_KEY

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .

# Inject Firebase config into the SW (it can't read env at runtime)
RUN node -e "const fs=require('fs');\
let p='public/firebase-messaging-sw.js';\
if(fs.existsSync(p)){let s=fs.readFileSync(p,'utf8');\
s=s.replace(/apiKey: \".*?\"/, 'apiKey: \"'+(process.env.VITE_FIREBASE_API_KEY||'')+'\"')\
   .replace(/authDomain: \".*?\"/, 'authDomain: \"'+(process.env.VITE_FIREBASE_AUTH_DOMAIN||'')+'\"')\
   .replace(/projectId: \".*?\"/, 'projectId: \"'+(process.env.VITE_FIREBASE_PROJECT_ID||'')+'\"')\
   .replace(/messagingSenderId: \".*?\"/, 'messagingSenderId: \"'+(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'')+'\"')\
   .replace(/appId: \".*?\"/, 'appId: \"'+(process.env.VITE_FIREBASE_APP_ID||'')+'\"');\
fs.writeFileSync(p,s);}"

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
