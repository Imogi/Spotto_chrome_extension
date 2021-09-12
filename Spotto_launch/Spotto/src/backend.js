/* ------------------------------------------ Spotto ------------------------------------------ //                                                           
    Created by Ricky Gian.

    Features
    -   Is a chrome extension that enables users to efficiently add any songs playing on Youtube
        to a spotify playlist of their choice. 
    -   Can undo most recently added song.
    -   Can create a new playlist.

    Technology used
    -   Javascript
    -   HTML/CSS
    -   Spotify, Chrome and Youtube APIs
// --------------------------------------------------------------------------------------------- */

/*
    Global values:
        - Song Uri
        - Cached Playlist
        - Cached Song
        - Cached recently clicked playlist
*/
var SONG_URI = '';
var RECENT_PLAYLIST_ID = '';
var RECENT_SONG_ID = '';
var LAST_CLICKED_PLAYLIST = '';
/*
    State and access token
*/
var STATE = '';
var ACCESS_TOKEN = '';

/*
    Shows that user is signed in
*/
var is_signed_in = false;

/*
    Parts of Authentication end point url
*/
const REDIRECT_URI = "https://keibimcompdilakjckclfephfangnjop.chromiumapp.org/";
const RESPONSE_TYPE = encodeURIComponent('token');
const AUTHORISE = "https://accounts.spotify.com/authorize";
const SCOPE = encodeURIComponent('user-modify-playback-state user-read-email user-read-private playlist-read-private playlist-modify-public playlist-modify-private playlist-modify');
const SHOW_DIALOG = encodeURIComponent('true');
/*
    Constructs the user's spotify's authorisation page url.
*/
async function create_authorisation_endpoint() {
    // creates STATE during endpoint call
    STATE = encodeURIComponent('indigoaloeVera' + Math.random().toString(36).substring(2, 15));

    let url = AUTHORISE;
    let data = await fetchLamdaData();

    url += "?client_id=" + data.message.client_id;
    url += "&response_type=" + RESPONSE_TYPE;
    url += "&redirect_uri=" + REDIRECT_URI;
    url += "&state=" + STATE;
    url += "&scope=" + SCOPE;
    url += "&show_dialog=" + SHOW_DIALOG;

    return url;
}

/*
    AWS Lamda function call
*/
async function fetchLamdaData() {
    try {
        const response = await fetch('https://mfwg5jjww7.execute-api.us-east-2.amazonaws.com/default/Spotto', {
            method: 'post',
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(error);
    }
}

/*
    This function was originally the body of within 'chrome.runtime.onMessage.addListener'
    however when I made the ()=> an async function it would give me the error of 
    "Unchecked runtime.lastError: The message port closed before a response was received."
    and this would prevent my backend from sending a response i.e message :success.
    I am pretty sure it had something to do with async/await but had no idea how to fix it
    other than this.
    https://stackoverflow.com/questions/54017163/how-to-avoid-the-message-port-closed-before-a-response-was-received-error-when
*/
const asyncFunctionAwait = async (request, sender, sendResponse) => {
    if (request.message === 'login') {

        if (is_signed_in) {
            console.log("User is already signed in.");
        }
        else {
            console.log("User is not logged in.");
            // sign the user in with Spotify
            // Uses chrome identity API
            chrome.identity.launchWebAuthFlow({
                url: await create_authorisation_endpoint(),
                interactive: true
            }, function (REDIRECT_URI) {
                if (chrome.runtime.lastError) {
                    sendResponse({ message: 'fail' });
                }
                else {
                    if (REDIRECT_URI.includes('callback?error=access_denied')) {
                        sendResponse({ message: 'fail' });
                    } else {
                        ACCESS_TOKEN = REDIRECT_URI.substring(REDIRECT_URI.indexOf('access_token=') + 13);
                        ACCESS_TOKEN = ACCESS_TOKEN.substring(0, ACCESS_TOKEN.indexOf('&'));
                        // Store ACCESS_TOKEN in chrome.storage.local as we cannot store it globally
                        // i.e won't exists outside of this scope. Was not saving in var ACCESS_TOKEN
                        // cannot access it in other functions.
                        chrome.storage.local.set({ "AC": ACCESS_TOKEN }, function () {
                            console.log("stored variable in local storage: " + ACCESS_TOKEN);
                        });
                        let state = REDIRECT_URI.substring(REDIRECT_URI.indexOf('state=') + 6);

                        if (state === STATE) {
                            console.log("State check is successful!")
                            user_signed_in = true;
                            /*
                                We need to have a timeout for ACCESS_TOKEN in order
                                to invalidate the token and provide more user
                                security. I.e if user does not give access to program
                                anymore without this, the program will still have the 
                                access token.
                                Is set to an hour, i.e user must re-login or auth every
                                hour.
                            */
                            setTimeout(() => {
                                // Set Access token to become empty.
                                chrome.storage.local.set({ "AC": '' }, function () {
                                    console.log("stored variable in local storage: " + ACCESS_TOKEN);
                                });
                                user_signed_in = false;
                            }, 3600000);

                            // As popupSignIn.js was closed and login was succesful, open the popupSignedIn.html
                            chrome.browserAction.setPopup({ popup: './popupSignedIn.html' }, () => {
                                sendResponse({ message: 'success' });
                            });
                        }
                        else {
                            sendResponse({ message: 'fail' });
                        }
                    }
                }
            });
        }
    }
    else if (request.message === 'logout') {
        is_signed_in = false;
        // As popupSignedIn.js was closed and logout was succesful, open the popupSignIn.html
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => {
            sendResponse({ message: 'success' });
        });
    }
}


/*
    Using Chrome API such as chrome.runtime, chrome.identity and chrome.browserAction.
    Listens for message from popupSignIn.js.
*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    asyncFunctionAwait(request, sender, sendResponse);
    return true;
});

// ----------------------------- MAIN FUNCTION THAT CALLS SPOTIFY API FOR VARIOUS MANIPULATION ----------------------------- //

// Utilises a Promise in order to extract the ACCESS_TOKEN 
// as chrome.storage.local.get() is an async function
async function access_chrome_local_storage(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get([key], function (value) {
                resolve(value);
            })
        }
        catch (ex) {
            reject(ex);
        }
    });
}

// Has to be async as within this function we make a call to an async
// function getAC_TOKEN() which retrieves the ACCESS_TOKEN from chrome.storage.local.get() 
// as I had stored the ACCESS_TOKEN in local storage.
async function callApi(method, url, body, callback) {
    let xhr = new XMLHttpRequest();
    // AC_TOKEN is an object object {'AC' : AC_TOKEN}
    let AC_TOKEN = await access_chrome_local_storage('AC');
    xhr.open(method, url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + AC_TOKEN.AC);
    xhr.send(body);
    xhr.onload = callback;
}


// ----------------------------- MAIN FUNCTIONS THAT CALLS SPOTIFY API FOR PLAYLIST POPULATION ----------------------------- //

function refreshPlaylists() {
    const PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
    callApi("GET", PLAYLISTS, null, handlePlaylistsResponse);
}

function handlePlaylistsResponse() {
    if (this.status == 200) {
        //alert(this.responseText);
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("playlists");
        // Add create a playlist.
        /*  
            I tried making it in the original html but it would only show 
            up for a split second so I think that the html itself is 
            being dynamically changed and thus deleting it.
        */
        // Check that document is popupSignedIn.html
        var playlistsEl = document.getElementById("playlists");
        if (playlistsEl) {
            // Create block for both image, and overlay
            let container = document.createElement('div');
            container.id = "create-new-playlist-container";
            container.className = "playlist_container";
            playlistsEl.appendChild(container);

            // Create playlist image element
            let node = document.createElement("img");
            node.id = "create-new-playlist-img";
            node.className = "create-new-playlist-img";
            node.src = "./images/create.png";
            document.getElementById(container.id).appendChild(node);
            // Create playlist overlay
            let playListNameNode = document.createElement("div");
            playListNameNode.className = "create-new-playlist-overlay";
            playListNameNode.id = "create-new-playlist-overlay";
            document.getElementById(container.id).appendChild(playListNameNode);
            // The playlist name inside of the overlay
            let playlistNode_name = document.createElement("div");
            playlistNode_name.className = "playlist-name";
            playlistNode_name.id = "create-new-playlist-overlay-name";
            playlistNode_name.textContent = "Create a new playlist";
            document.getElementById(playListNameNode.id).appendChild(playlistNode_name);
            // Add eventlistener to create a playlist
            document.getElementById(container.id).addEventListener('click', function () {
                // Display the popup
                document.querySelector('.input-modal').style.display = 'flex';
                // Add the input box counter
                document.getElementById('playlist-name-input').addEventListener('input', function () {
                    let count = document.getElementById('playlist-name-input').value.length;
                    document.getElementById('input-box-count').innerHTML = count + "/100 (Max Characters 100)."
                });
                // Add the textarea counter
                document.getElementById('playlist-description-input').addEventListener('input', function () {
                    let count = document.getElementById('playlist-description-input').value.length;
                    document.getElementById('textarea-count').innerHTML = count + "/300 (Max Characters 300)."
                });
                // Add functionality to close button
                document.querySelector('.close-modal').addEventListener('click', function () {
                    // Remove all content from input and textarea
                    document.querySelector('#playlist-name-input').value = "";
                    document.querySelector('#playlist-description-input').value = "";
                    // Changes display
                    document.querySelector('.input-modal').style.display = 'none';
                    // Clears input and textarea counter
                    document.getElementById('input-box-count').innerHTML = "0/100 (Max characters 100)";
                    document.getElementById('textarea-count').innerHTML = "0/300 (Max characters 300)";
                    // Refresh document
                    location.reload();
                });
                // Add functionality to create button
                document.getElementById('submit-btn').addEventListener('click', function () {
                    CreatePlaylistCall(generateEndpointCreatePlaylist(), generateRequestBodyForCreatingPlaylist());
                });
            });
        }

        // Add all the users playlists
        data.items.forEach(item => addPlaylist(item));
    }
    else {
        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}

var COUNT = 0;
// Add playlists to playlist div
function addPlaylist(item) {

    // Check that playlistEl exists, i.e popupSignedIn.html is loaded
    var playlistEl = document.getElementById("playlists");
    if (playlistEl) {
        // Create block for both image, and overlay
        let container = document.createElement('div');
        container.id = "playlist_container" + COUNT;
        container.className = "playlist_container";
        playlistEl.appendChild(container);

        // Create playlist image element
        let node = document.createElement("img");
        node.value = item.id;
        let id = "playlistImg:" + item.id;
        node.id = id;
        node.className = "playlistImgClass";
        // Checks that there is an image i.e user created a new playlist within spotify.
        if (item.images[0] != undefined) {
            node.src = item.images[0].url;
        }
        else {
            node.src = "./images/blank.png";
        }
        document.getElementById(container.id).appendChild(node);

        // Play list name overlay
        let playListNameNode = document.createElement("div");
        let individualPLNodes = "playlistNameNodeClass:" + item.name
        playListNameNode.className = "playlistNameNodeClass";
        playListNameNode.id = individualPLNodes;
        document.getElementById(container.id).appendChild(playListNameNode);

        // The playlist name inside of the overlay
        let playlistNode_name = document.createElement("div");
        playlistNode_name.className = "playlist-name";
        let playlistNode_name_id = "plname" + item.id;
        playlistNode_name.id = playlistNode_name_id;
        playlistNode_name.textContent = item.name;
        document.getElementById(individualPLNodes).appendChild(playlistNode_name);

        COUNT++;
        document.getElementById(container.id).addEventListener('click', function () {
            SearchPlaylist(generateEndpointSearchPlaylist(node.value));
        });
    }
}
// Removes all playlists from drop down menu
function removeAllItems(elementId) {
    let node = document.getElementById(elementId);
    if (node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
}


// ----------------------------- MAIN FUNCTIONS THAT CALLS CHROME & YOUTUBE API TO OBTAIN YOUTUBE VIDEO TITLE ----------------------------- //

// Utilising the chrome.tabs API, we can obtain the url of current tab
// Uses a promise to return the url
async function getYTURL() {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                resolve(tabs[0].url);
            });
        }
        catch (ex) {
            reject(ex);
        }
    });
}

// I use youtube api and chrome api to scrap the title of the youtube video
async function extract_snippet_url() {

    let data = await fetchLamdaData();

    // Utilising the chrome.tabs API, we can obtain the url of current tab
    let yt_api_key = data.message.yt_api_key;
    let yt_video_url = await getYTURL();

    let yt_video_id = yt_video_url.substring(yt_video_url.indexOf('v=') + 2, 43);
    let yt_snippet_endpoint = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + yt_video_id + "&key=" + yt_api_key;
    return yt_snippet_endpoint;
}

// I am able to get youtube url and extract the id 
// Stuck between using xhttp like below to use my document method to extract video title but runs into CORS error
// I fixed this through directing the xhttprequest to a snippet containing information for the youtube video, and 
// not making a request to the actual youtube video url which gives a CORS error.

async function loadDoc() {

    const xhttp = new XMLHttpRequest();
    xhttp.open("GET", await extract_snippet_url(), true);
    xhttp.send();
    xhttp.onload = function () {
        let jv = JSON.parse(xhttp.responseText);
        // Check if current page is on YouTube
        if (jv.items.length === 0) {
            return;
        }
        let videoTitle = jv.items[0].snippet.title;
        let ItemSearchEndpoint = generateEndpoint(videoTitle);
        itemSearch(ItemSearchEndpoint);
    }
}


// ----------------------------- MAIN FUNCTIONS THAT CALLS SPOTIFY API FOR SONG SEARCHING ----------------------------- //

function generateEndpoint(videoTitle) {
    let ItemSearchEndpoint = "https://api.spotify.com/v1/search?q=";

    // -------- Normaliser function for videoTitle -------- //

    // Removes '-'
    videoTitle = videoTitle.replace(/-/g, ' ');
    // Removes '(Words)'
    videoTitle = videoTitle.replace(/\([^)]*\)/gi, '');
    // Removes '(Feat. words)'
    videoTitle = videoTitle.replace(/\(Feat\..+\)/gi, '');
    // Removes '[Words]'
    videoTitle = videoTitle.replace(/\[.+\]/g, '');
    // Removes 'ft.'
    videoTitle = videoTitle.replace(/ft\./g, '');
    // Removes 'MV' if it is seperate and not in a word
    videoTitle = videoTitle.replace(/ MV/gi, '');
    // Removes 'M/V' 
    videoTitle = videoTitle.replace(/ M\/V/gi, '');
    // Removes 'lyrics'
    videoTitle = videoTitle.replace(/(Lyrics)/gi, '');
    // Removes '&'
    videoTitle = videoTitle.replace(/&/gi, ' ');
    // Removes '|'
    videoTitle = videoTitle.replace(/\|/g, '');
    // Removes '_'
    videoTitle = videoTitle.replace(/_/g, '');
    // Removes '/'
    videoTitle = videoTitle.replace(/\//g, '');
    // Spotify search requires the query to have %20 for spaces
    videoTitle = videoTitle.replace(/\s/g, '%20');

    ItemSearchEndpoint += videoTitle;
    ItemSearchEndpoint += "&type=track&limit=3";
    //alert(ItemSearchEndpoint);
    return ItemSearchEndpoint;
}

// We currently are calling this funciton in loadDoc() due being annoying to extract callback
function itemSearch(ItemSearchEndpoint) {
    callApi("GET", ItemSearchEndpoint, null, handleSongResponse);
}

// Returns spotify uri of song
function handleSongResponse() {
    if (this.status == 200) {
        //alert(this.responseText);
        var data = JSON.parse(this.responseText);
        SONG_URI = data.tracks.items[0].uri;
        SONG_NAME = data.tracks.items[0].name;
        SONG_ARTIST = data.tracks.items[0].artists[0].name;

        // Append song name to Spotto
        song_name = document.getElementById('song_name');
        song_name.textContent = '🎧 ' + SONG_NAME;
        // Append song artist to Spotto
        song_artist = document.getElementById('song_artist');
        song_artist.textContent = '🎤 ' + SONG_ARTIST;
    }
    // Session time-out
    else {
        //alert("RAN SONG SEARCHING");
        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}

// ----------------------------- MAIN FUNCTIONS THAT CALLS SPOTIFY API FOR ADDING SONG TO PLAYLIST ----------------------------- //

function generateEndpointAddSongToPlaylist(play_list_id) {
    let ItemAddEndpoint = "https://api.spotify.com/v1/playlists/";

    chrome.storage.local.set({ "RECENT_PLAYLIST_ID": play_list_id }, function () { });
    chrome.storage.local.set({ "RECENT_SONG_ID": SONG_URI }, function () { });

    ItemAddEndpoint += play_list_id;
    ItemAddEndpoint += "/tracks?uris=";
    ItemAddEndpoint += SONG_URI.replace(/:/g, '%3A');
    return ItemAddEndpoint;
}

// Calls the callApi function to add song to playlist
function AddItemToPlaylist(ItemAddEndpoint) {
    callApi("POST", ItemAddEndpoint, null, handleAddSongToPlaylistResponse);
}

function handleAddSongToPlaylistResponse() {
    if (this.status == 201) {
        // Modal popup
        document.querySelector("#Successful-song-add").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Successful-song-add").style.display = 'none';
        }, 1000);
    }
    else if (this.status == 400) {
        // Modal popup
        document.querySelector("#Failed-song-add").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Failed-song-add").style.display = 'none';
        }, 2000);
    }
    // You do not have the users authorisation OR playlist has > 10,000 items.
    else if (this.status == 403) {
        // Modal popup
        document.querySelector("#Fail-song-add-OwnerAuth").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Fail-song-add-OwnerAuth").style.display = 'none';
        }, 2000);
    }
    else {

        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}

// -------------------- Search Playlist's items for checking Duplicates Function -------------------- //
// If there is a duplicate return true
function checkDuplicates(json_data) {
    // json_data is an object promise, i.e we have to do an await?
    for (const index in json_data.items) {
        //alert(json_data.items[i].track.uri + " == " + SONG_URI);
        if (json_data.items[index].track.uri == SONG_URI) {
            // Modal popup
            document.querySelector("#duplicates-popup").style.display = 'flex';
            setTimeout(() => {
                document.querySelector("#duplicates-popup").style.display = 'none';
            }, 2000);
            // How come a return; doesnt just work?
            return false;
        }
    }
    // If there are no duplicates add the song
    AddItemToPlaylist(generateEndpointAddSongToPlaylist(LAST_CLICKED_PLAYLIST));
}
function generateEndpointSearchPlaylist(play_list_id) {
    // Value is different from RECENT_PLAYLIST_ID <- only happens for successful adds
    LAST_CLICKED_PLAYLIST = play_list_id;

    let ItemAddEndpoint = "https://api.spotify.com/v1/playlists/";
    // Add cached playlist i.e the playlist that has recently been added to
    ItemAddEndpoint += play_list_id;
    ItemAddEndpoint += "/tracks?fields=items.track(uri)";
    return ItemAddEndpoint;
}

// Calls the callApi function 
function SearchPlaylist(ItemAddEndpoint) {
    callApi("GET", ItemAddEndpoint, null, handleSearchPlaylistResponse);
}
// If it returns true then either there is a duplicate or reponse failed
function handleSearchPlaylistResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        checkDuplicates(data);
    }
    else {
        //alert("RAN SEARCH PLAYLIST");
        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}

// ----------------------------- Remove Items from a Playlist Function ----------------------------- //

var undo_btn = document.getElementById("undo");
if (undo_btn) {
    undo_btn.addEventListener('click', function () {
        RemoveItemFromPlaylist(generateEndpointDeleteSongFromPlaylist(), generateRequestBodyForRemovingSongs());
    });
}



async function generateEndpointDeleteSongFromPlaylist() {

    let RECENT_PLAYLIST_ID = await access_chrome_local_storage("RECENT_PLAYLIST_ID");

    // If there is no recent playlist
    if (RECENT_PLAYLIST_ID.RECENT_PLAYLIST_ID == '') {
        // Modal popup
        document.querySelector("#Failed-undo").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Failed-undo").style.display = 'none';
        }, 2000);
    }
    // Else if there is a recent playlist
    else {
        let ItemAddEndpoint = "https://api.spotify.com/v1/playlists/";
        // Add cached playlist i.e the playlist that has recently been added to
        ItemAddEndpoint += RECENT_PLAYLIST_ID.RECENT_PLAYLIST_ID;
        ItemAddEndpoint += "/tracks";
        return ItemAddEndpoint;
    }
}

async function generateRequestBodyForRemovingSongs() {
    let RECENT_SONG_ID = await access_chrome_local_storage("RECENT_SONG_ID");

    let body = "{\"tracks\":[{\"uri\":\"" + RECENT_SONG_ID.RECENT_SONG_ID + "\"}]}";
    return body;
}

// Calls the callApi function to remove song from a playlist
async function RemoveItemFromPlaylist(ItemAddEndpoint, request_body) {
    callApi("DELETE", await ItemAddEndpoint, await request_body, handleRemoveSongFromPlaylistResponse);
}

function handleRemoveSongFromPlaylistResponse() {
    // Success
    if (this.status == 200) {

        // Set playlist id as empty because we already succesfully removed the song
        chrome.storage.local.set({ "RECENT_PLAYLIST_ID": '' }, function () { });
        // Modal popup
        document.querySelector("#Successful-undo").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Successful-undo").style.display = 'none';
        }, 3000);
    }
    // Session time out
    else {
        //alert("RAN REMOVE SONG PLAYLIST");
        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}

// ------------------------------ FUNCTIONS FOR CREATING A NEW PLAYLIST ------------------------------ //
function generateEndpointCreatePlaylist() {

    let ItemAddEndpoint = "https://api.spotify.com/v1/me/playlists";
    // Add cached playlist i.e the playlist that has recently been added to
    //alert(ItemAddEndpoint);
    return ItemAddEndpoint;

}

// Calls the callApi function to remove song from a playlist
function CreatePlaylistCall(ItemAddEndpoint, request_body) {
    callApi("POST", ItemAddEndpoint, request_body, handleCreatePlaylistResponse);
}

function generateRequestBodyForCreatingPlaylist() {
    // Get text from input
    let playlist_name = document.getElementById('playlist-name-input').value;
    // Get text from textarea
    let playlist_description = document.getElementById('playlist-description-input').value;
    // Creating request body
    let body = "{\"name\":\"" + playlist_name + "\",\"description\":\"" + playlist_description + "\",\"public\":true}";
    return body;
}

function handleCreatePlaylistResponse() {
    if (this.status == 200 || this.status == 201) {
        // Modal popup
        document.querySelector("#Successful-playlist-creation").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Successful-playlist-creation").style.display = 'none';
        }, 3000);
        // Remove all content from input and textarea
        document.querySelector('#playlist-name-input').value = "";
        document.querySelector('#playlist-description-input').value = "";
        // Clears input and textarea counter
        document.getElementById('input-box-count').innerHTML = "0/100 (Max characters 100)";
        document.getElementById('textarea-count').innerHTML = "0/300 (Max characters 300)";
    }
    else if (this.status == 400) {
        // Modal popup
        document.querySelector("#Fail-playlist-creation").style.display = 'flex';
        setTimeout(() => {
            document.querySelector("#Fail-playlist-creation").style.display = 'none';
        }, 3000);
    }
    else {
        alert("NEW PLAYLIST");
        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}

// ---------------------- MAIN FUNCTIONS THAT CALLS SPOTIFY API FOR PROFILE PICTURE ----------------------- //

// When the user has logged in and the main screen pops up append pfp

function generateEndpointProfilePictureExtract() {
    let ItemSearchEndpoint = "https://api.spotify.com/v1/me";
    return ItemSearchEndpoint;
}

// Calls the callApi function for profile picture searching
function pfpSearch(ItemSearchEndpoint) {
    callApi("GET", ItemSearchEndpoint, null, handlePfpResponse);
}

// Returns users pfp url
function handlePfpResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        // Obtain the users profile picture
        img = document.createElement('img');
        // Give img a id
        img.id = "pfp";
        img.src = data.images[0].url;

        // If we do not have the if as the js loads before the html
        // header will be null and thus we are appending to a null object.
        let menu = document.getElementById("nav-list");
        let li = document.createElement('li');
        li.className = "nav-items";
        if (menu) {
            menu.appendChild(li);
            if (li != null) {
                li.appendChild(img);
            }
        }

    }
    // This alert popped up when AC was cleared
    else {
        //alert("RAN PFP");
        document.querySelector('#session-timeout-modal').style.display = 'flex';
        // Change popup
        chrome.browserAction.setPopup({ popup: './popupSignIn.html' }, () => { });
        setTimeout(() => {
            window.close();
        }, 4000);
    }
}


// ----------------------------- Hamburger Menu ----------------------------- //
const menu = document.querySelector('.hamburger-menu');
const navbar = document.querySelector('.nav-bar');
if (menu) {
    menu.addEventListener('click', () => {
        navbar.classList.toggle('changed');
    });
}


// ------------------------ Scroll to top Function ------------------------ //
const scroll_up_btn = document.getElementById("scroll-to-top");

window.onscroll = function () {
    scroll_display()
};
function scroll_display() {
    if (document.documentElement.scrollTop > 100) {
        scroll_up_btn.style.display = "block";
    } else {
        scroll_up_btn.style.display = "none";
    }
}

var scrollToTopEl = document.getElementById('scroll-to-top');
// This serves as a check for if popupSignedIn.html has loaded
// Should have just done this and clumped all the document.addEventListeners or load into here
if (scrollToTopEl) {
    scrollToTopEl.addEventListener('click', scrollToTop);
    document.addEventListener("load", loadDoc());
    document.addEventListener("load", refreshPlaylists());
    document.addEventListener("load", pfpSearch(generateEndpointProfilePictureExtract()));
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
