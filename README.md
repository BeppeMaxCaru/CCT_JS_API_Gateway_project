OpenSSL command to generate private keys + certificates: openssl req -nodes -new -x509 -keyout key.pem -out certificate.pem
When asked to insert fields just keep pressing Enter

To use the https connection don't go to localhost:3000 which is simple http so it won't work
Go to https://localhost:3000/login instead!