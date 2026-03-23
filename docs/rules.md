use the inspiration design to design the page and use theme colors

use the correct folder structure each intface should be in interfacec folder and file ,
composables grouped together in there composables make user each file should have less lines of code to be readable and maintainable
add documentation to the code and service api for call the api 

here is the registerayion api 

http://localhost:8090/api/v1/auth/register

example request 

{
  "organisation": {
    "name": "South Sudan widows and orphand organisation",
    "description": "Local NGO providing CP and PSS in Malakal PoC",
    "country": "SS"
  },
  "user": {
    "full_name": "Nyawelo Deng",
    "email": "kual@sswoco.org",
    "password": "SecurePass123"
  }
}