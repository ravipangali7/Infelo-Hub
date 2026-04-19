server {
    server_name api.infelogroup.com;

    location = /favicon.ico { 
        access_log off; 
        log_not_found off; 
    }
    
    client_max_body_size 500M;
    
    location /static/ {
        root /home/luna/applications/r/Infelo-Group/server;
    }   

    location /media/ {
        root /home/luna/applications/r/Infelo-Group/server;
    }

    location / {
        include proxy_params;
        proxy_pass http://127.0.0.1:1470;
    }

    


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api.infelogroup.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.infelogroup.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = api.infelogroup.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    server_name api.infelogroup.com;
    listen 80;
    return 404; # managed by Certbot


}