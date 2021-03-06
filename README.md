<img src="Spotto_launch/Spotto/src/images/spotto_for_md.png">

## Table of Contents
- [Introduction](#introduction)
- [How to install](#how-to-install)
- [Features](#features)
- [System Architecture Overview](#system-architecture-overview)
- [Programming languages and APIs utilised](#programming-languages-and-apis-utilised)
- [Issued faced](#issues-faced)
- [What I learnt](#what-i-learnt)
- [License](#license)

<a name="introduction"></a>
## Introduction
# Why is there only a few commits?
I had another repository where I had worked on this project, however I made the mistake of adding public API keys to that repository and thus decided it would be safer to delete that reporsitory compeletey and move my work into a clean and safe repository that does not contain my secrets and API keys.

# Proper Introduction
Spotto is a chrome extension that lets you add videos from youtube directly into a Spotify playlist, provided the youtube video exists in Spotify. This was created as a result of my desire to be able to add songs I found on youtube straight into one of my Spotify playlists which has become Spotto!  

<a name="how-to-install"></a>
## How to install
This is the link to the chrome webstore page of my extension!
<br>
https://chrome.google.com/webstore/detail/spotto/keibimcompdilakjckclfephfangnjop?hl=en&authuser=0
<br>
Alternatively you can search 'Spotto' in the chrome web store.
Now you have Spotto loaded! The extension icon looks like this
<br>
<img src="Spotto_launch/Spotto/src/images/SpottoChromeIcon (2).png">
<br><br>

<a name="features"></a>
## Features
- Add a song to a playlist
- Undo the most recently added song
- Create a new playlist

<a name="system-architecture-overview"></a>
## System Architecture Overview
<img src="Spotto_launch/Spotto/src/images/SA.png">

<a name="programming-languages-and-apis-utilised"></a>
## Programming languages and REST APIs utilised
The programming langugages utilised for this project are predominantly HTML, CSS and pure javascript due to the language restrictions placed upon building Chrome extensions. Additionally I interacted and made many web/REST API calls to the Spotify, chrome.runtime, chrome.identity, chrome.browserAction and Youtube API's due to the nature of my chosen method.

Additionally Spotto makes calls to a Nodejs server running on AWS Lambda to fetch API keys and secrets.

<a name="issues-faced"></a>
## Issues faced
Spotify calls that did not involve searching for a song.
The first issue was enabling the user to login to 'Spotify' in order for my backend to connect with the client and extract the information and privliges required to perform my tasks. I decided to use Spotifys own authorisation flow as it is the most secure method available without the need to implement my own login system, additionally my backend only required the access token which the Auth flow granted. I ran into various issues involving the different jargons or api calls in order to extract various items I needed or to make calls to add a song for example but eventually I managed to solve these issues through research and applying the new found knowledge. The first huge issue that occured was attempting to utilise Spotifys own search API call and this is where the chrome and Youtube APIs are utilised. 

Chrome and Youtube API
I decided to use the chrome and youtube api in conjunction with each other to extract the youtube videos title because I wanted to only use pure javascript as the alternative was to use jquery, PHP, ajax calls or pharsing a extremely large DOM. This took some time as I needed to read alot of documentation on the use of the two new APIs however eventually I again managed to implement these calls to eventually extract the youtube video name which then needed to be normalised as spotify's search query field had its own format, furthermore through testing I realised the search query must be devoid of brackets, punctuation and various other elements all of which I added into the normalise function. 

API keys and Secrets
As mentioned in my introduction I was forced to remove my previous repository due to exposing my API keys and secrets to the public (a VERY important lesson and something that I will never risk or do again). Due to this mistake I learned the importance of keeping keys and secrets hidden because there is a lot of dangers with exposing those sensitve information. So how did I manage to hide the keys compeletly? Well I integrated a NodeJs backend running on AWS Lambda that will send the required keys when requested by my chrome extension.

<a name="what-i-learnt"></a>
## What I learnt
This project pushed me to learn a lot of new concepts regarding JS, HTML and CSS! I really enjoyed the various challenges in trying to not only understand documentation, online forum help but to also to utilise these ideas or concepts for my own use. By the end of this project I feel as if my problem solving skills and language proficiency with the aforementioned programming languages have all improved tremendously. 

In regards to the visual component and various elements of my application I made many improvements through feedback from a lot of my friends or peers through a test use of my chrome extension, this further reiterated the importance of usability testing for frontend components of an application as there were a lot of visual tweaks or flaws that were present.

<a name="license"></a>
## License
This project is licensed under the MIT License - see the [LICENSE](https://github.com/Imogi/Spotto/blob/5d613b84e0465c3cd39d8160e0eeab553309fe5b/LICENSE) file for details
