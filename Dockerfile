from alpine

run apk update
run apk add openssh uv bash runuser
run apk add vim

run adduser instruktur -s /bin/bash -D
run echo instruktur:h4rdT0bre4k | chpasswd

copy entry.sh /entry.sh
run chmod +x /entry.sh

cmd ["/entry.sh"]
