server {
    
    server_name infelogroup.com www.infelogroup.com;

    root /home/luna/applications/r/Infelo-Group/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: API proxy (if backend exists)
     location /api/ {
         proxy_pass http://127.0.0.1:1470;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache static files
    location ~* \.(js|mjs|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =40  4;
    }


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/infelogroup.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/infelogroup.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}server {
    if ($host = infelogroup.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    
    server_name infelogroup.com www.infelogroup.com;
    listen 80;
    return 404; # managed by Certbot


}