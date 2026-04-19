server {
    
    server_name infelohub.infelogroup.com;

    root /home/luna/applications/r/Infelo-Hub/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: API proxy (if backend exists)
     location /api/ {
         proxy_pass http://127.0.0.1:1471;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache static files
    location ~* \.(js|mjs|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =40  4;
    }

}