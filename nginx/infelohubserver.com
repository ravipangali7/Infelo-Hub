server {
    server_name infelohubserver.infelogroup.com;

    location = /favicon.ico { 
        access_log off; 
        log_not_found off; 
    }
    
    client_max_body_size 500M;
    
    location /static/ {
        root /home/luna/applications/r/Infelo-Hub/server;
    }   

    location /media/ {
        root /home/luna/applications/r/Infelo-Hub/server;
    }

    location / {
        include proxy_params;
        proxy_pass http://127.0.0.1:1471;
    }

}