async function init(){
    await loadIdentity();
    loadPosts({sort: 'newest'}); //show the newest posts first
    loadFilterOptions();
}
// changed loadPosts to include a filters parameter
async function loadPosts(filters = {}) {
    document.getElementById("posts_box").innerText = "Loading...";
    document.getElementById('sortOrder').style.display = 'block';
    document.getElementById('searchInput').value = ''
    document.getElementById('sortOrder').value = filters.sort;
    const queryString = new URLSearchParams(filters).toString(); //creates a new search query based off of filter parameter
    let postsJson = await fetchJSON(`api/posts?${queryString}`);
    let usersJson = await fetchJSON(`api/users/reputationScore`);

    if (postsJson.length === 0) {
        document.getElementById("posts_box").innerText = 'No posts found matching your criteria.';
    } else {

        let postsHtml = postsJson.map(postInfo => {
            /*
            Each postInfo will have the following available fields to call on [postInfo.field_name]:
            username, scam_date, description, image, anonymous, scam_type, frequency, scammer_phone, scammer_email, org, created_date
            */
            if (!postInfo.anonymous && usersJson[postInfo.username] != null) {
                postInfo.userRepScore = usersJson[postInfo.username];
            }

            let image;
            if (postInfo.image.data != null) {
                let imgBase64 = btoa(
                    postInfo.image.data.data.reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                let imageSrc = `data:image/${postInfo.image.contentType};base64,${imgBase64}`;
                image = `<img style="max-width: 280px; display: block; margin: auto;" src="${imageSrc}">`;
            }
            return `
            <div class="post">
                <div class="postHeader">
                    <div class="username">
                        <h3>Username:  ${!postInfo.anonymous ? `<a href="/userInfo.html?user=${encodeURIComponent(postInfo.username)}" class="username">${escapeHTML(postInfo.username)}</a>` : "Anonymous" }</h3>
                    </div>
                    ${postInfo.userRepScore != null ? `<h5>Reputation Score: ${postInfo.userRepScore}</h5>` : ``}
                    <h5>Posted on: ${escapeHTML(postInfo.created_date)}</h5>
                </div>
                <div class="postInfoDisplay"> <!--Put the info fields from above in this div.-->
                    <h3>What Happened</h3>
                    <p>${escapeHTML(postInfo.description)}</p>
                    <p>${image != null ? image : ''}<br></p>

                    <h3>Phish Details</h3>
                    <p>
                    <ul>
                        ${postInfo.scam_date ? `<li>Scam Date: ${escapeHTML(postInfo.scam_date)}</li>`: ''}
                        ${postInfo.scam_type ? `<li>Scam Type: ${escapeHTML(postInfo.scam_type)} </li>`: ''}
                        ${postInfo.frequency ? `<li>Frequency (least 1-5 most): ${escapeHTML(postInfo.frequency.toString())} </li>`: ''}
                        ${postInfo.scammer_phone ? `<li>Scammer's Phone: ${escapeHTML(postInfo.scammer_phone)} </li>`: ''}
                        ${postInfo.scammer_email ? `<li>Scammer's Email: ${escapeHTML(postInfo.scammer_email)} </li>`: ''}
                        ${postInfo.org ? `<li>Who the scammer pretended to be: ${escapeHTML(postInfo.org)} </li>`: ''}
                    </ul>
                    </p>
                </div>

                <div class="post-interactions">
                <h3>What do you think?</h3>
                    <div>
                        <span title="${postInfo.likes? escapeHTML(postInfo.likes.join(", ")) : ""}"> ${postInfo.likes ? `${postInfo.likes.length}` : 0} likes </span> &nbsp; &nbsp;
                        <span class="heart-button-span ${myIdentity? "": "d-none"}">
                            ${postInfo.likes && postInfo.likes.includes(myIdentity) ?
                                `<button class="heart_button" onclick='unlikePost("${postInfo.id}")'>&#x2665;</button>` :
                                `<button class="heart_button" onclick='likePost("${postInfo.id}")'>&#x2661;</button>`}
                        </span>
                    </div>
                    <br>
                    <button class="smaller-button" onclick='toggleComments("${postInfo.id}")'>View/Hide comments</button>
                    <div id='comments-box-${postInfo.id}' class="comments-box d-none">
                        <button class="smaller-button" onclick='refreshComments("${postInfo.id}")')>refresh comments</button>
                        <div id='comments-${postInfo.id}'></div>
                        <div class="new-comment-box ${myIdentity? "": "d-none"}">
                            New Comment:
                            <textarea type="textbox" id="new-comment-${postInfo.id}"></textarea>
                            <button class="smaller-button" onclick='postComment("${postInfo.id}")'>Post Comment</button> <span id='commentStatus-${postInfo.id}'></span>
                        </div>
                    </div>
                </div>
            </div>`
        }).join("\n");
        document.getElementById("posts_box").innerHTML = postsHtml;
    }
}

//helper for loading filtered posts
async function loadFilteredPosts() {
    const filterFrequency = document.getElementById('filter_frequency').value;
    const filterScamType = document.getElementById('filter_scam_type').value;
    const filterOrg = document.getElementById('filter_org').value;
    const sortDate = document.getElementById('sortOrder').value
    loadPosts({
        frequency: filterFrequency,
        scam_type: filterScamType,
        org: filterOrg,
        sort: sortDate
    });
}

//pulls queries from posts.js and populates the actual dropdowns
async function loadFilterOptions() {
    try {
        const response = await fetch('/api/posts/filter-options');
        const data = await response.json();

        populateDropdown('filter_frequency', data.frequency);
        populateDropdown('filter_scam_type', data.scamTypes);
        populateDropdown('filter_org', data.orgs)
    } catch (error) {
        document.getElementById('userErrorMessage').innerText = 'Error loading filter options: ', error;
    }
}
//to dynamically generate filtering options and append to existing dropdowns
function populateDropdown(dropdownId, options) {
    const dropdown = document.getElementById(dropdownId);
    options.forEach(option => {
        // Check if the option is neither null, undefined, nor an empty string
        if (option !== null && option !== undefined && option !== '' && option !== 'null') {
            const opt = document.createElement('option');
            opt.value = opt.textContent = option;
            dropdown.appendChild(opt);
        }
    });
}
function resetFilters() {
    let filters = document.querySelectorAll('.filter');
    filters.forEach(filter => {
        filter.selectedIndex = 0;
    });
    loadPosts({sort: 'newest'});
}

async function postPhish() {
    let description = document.getElementById("descriptionInput").value; //a string is stored
    if (!description || description == '') {
        document.getElementById("postStatus").innerText = "make sure all required fields are filled";
    } else {
        //Once our user presses that submit button on their client (index.html) all that info is no gonna be transferred over and stored into our local values.
        document.getElementById("postStatus").innerText = "sending data..."
        let scam_date = document.getElementById("sDateInput").value; //a date is stored
        if (scam_date != "") {
            // Format the date without timezone information
            scam_date = new Date(scam_date).toDateString('en-US');
        }
        let image = document.getElementById("imageUpload"); //A array of image files is stored, refer to each file like image[#], and get their individual info like image[#].name/size/type
        let scamTypeInput = document.querySelector('input[name="sType"]:checked');
        let scam_type = "";
        if (scamTypeInput != null) {
            scam_type = scamTypeInput.value; //Get the value from the bubble that was chosen (queryselector works like the find function in the ide)
        }
        let scammer_email = document.getElementById("sEmail").value; //A string is stored
        let scammer_phone = document.getElementById("sPhone").value; //A string of 10 digits is stored, either in "000-000-0000" or "0000000000" format, we need to post process it later.
        let frequency = document.getElementById("sFrequency").value; //A number from 1-5 is stored
        let anonymous = document.getElementById("anonCheckbox").checked ? 'yes' : 'no';
        let org = document.getElementById("org").value; //A string is stored
        //username value is read in the posts api.

        //We do our input formatting checks here before posting to database:
        let cont = true;
        if(scammer_phone != "") { //If there is anything inputed for the phone
            scammer_phone=scammer_phone.replaceAll('-','').trim();

            if(scammer_phone.length != 10) { //check if it is correctly formatted.
                cont = false;
                document.getElementById("postStatus").innerText = "please provide a valid scammer phone number! (10 digits)";
            }
        }

        if(scammer_email != "") { //If there is anythign inputed for email
            if(!scammer_email.includes('@') || !scammer_email.includes('.') ){
                cont = false;
                document.getElementById("postStatus").innerText = "please provide a valid scammer email! (needs an '@' and a '.')";
            }
        }

        if(cont == true){
            // required use of FormData to support image upload + storage on the server-side
            let formData = new FormData();
            formData.append("scam_date", scam_date);
            formData.append("description", description);
            formData.append("image", image.files[0]);
            formData.append("scam_type", scam_type);
            formData.append("scammer_email", scammer_email);
            formData.append("scammer_phone", scammer_phone);
            formData.append("frequency", frequency);
            formData.append("anonymous", anonymous);
            formData.append("org", org);

            try {
                await fetch(`api/posts`, {
                    method: "POST",
                    //give all the info over to the post handler in the post api to be used for displaying on the DOM.
                    //Access these in the handler by calling req.body.key
                    body: formData
                })
            } catch (error) {
                document.getElementById("postStatus").innerText = "Error"
                throw (error)
            }
            //Reset all input fields for a fresh post.
            document.getElementById("sDateInput").value = "";
            document.getElementById("descriptionInput").value = "";
            document.getElementById("imageUpload").value = "";

            let radioBtns = document.getElementsByName("sType");
            radioBtns.forEach((btn) => {
                btn.checked = false;
            });

            document.getElementById("sEmail").value = "";
            document.getElementById("sPhone").value = "";
            document.getElementById("sFrequency").value = "";
            document.getElementById("anonCheckbox").checked = "";
            document.getElementById("org").value = "";
            document.getElementById("postStatus").innerText= "successfully uploaded";

            loadPosts({sort: "newest"});
        }
    }
}

async function likePost(postID){
    await fetchJSON(`api/posts/like`, {
        method: "POST",
        body: {postID: postID}
    })
    loadPosts();
}

async function unlikePost(postID){
    await fetchJSON(`api/posts/unlike`, {
        method: "POST",
        body: {postID: postID}
    })
    loadPosts();
}

function getCommentHTML(commentsJSON){
    return commentsJSON.map(commentInfo => {
        return `
        <div class="individual-comment-box">
            <div>${escapeHTML(commentInfo.comment)}</div>
            <div> - <a class="comment-username" href="/userInfo.html?user=${encodeURIComponent(commentInfo.username)}">${escapeHTML(commentInfo.username)}</a>, ${escapeHTML(commentInfo.created_date)}</div>
        </div>`
    }).join(" ");
}

async function toggleComments(postID){
    let element = document.getElementById(`comments-box-${postID}`);
    if(!element.classList.contains("d-none")){
        element.classList.add("d-none");
    }else{
        element.classList.remove("d-none");
        let commentsElement = document.getElementById(`comments-${postID}`);
        if(commentsElement.innerHTML == ""){ // load comments if not yet loaded
            commentsElement.innerHTML = "loading..."

            let commentsJSON = await fetchJSON(`api/comments?postID=${postID}`)
            commentsElement.innerHTML = getCommentHTML(commentsJSON);
        }
    }

}

async function refreshComments(postID){
    let commentsElement = document.getElementById(`comments-${postID}`);
    commentsElement.innerHTML = "loading..."

    let commentsJSON = await fetchJSON(`api/comments?postID=${postID}`)
    commentsElement.innerHTML = getCommentHTML(commentsJSON);
}

async function postComment(postID){
    let newComment = document.getElementById(`new-comment-${postID}`).value;

    if(newComment != "") {
        await fetchJSON(`api/comments`, {
            method: "POST",
            body: {postID: postID, newComment: newComment}
        })
        document.getElementById(`new-comment-${postID}`).value = "";
        document.getElementById(`commentStatus-${postID}`).innerHtml = 'Comment Posted!';
        refreshComments(postID);
    } else {
        document.getElementById(`commentStatus-${postID}`).innerHtml = 'Write something first!';
    }

}

//scrolls user to top of page after post
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('postPhish').addEventListener('click', function() {
        const targetDiv = document.getElementById('phish-display-div');
            targetDiv.scrollIntoView({ behavior: 'smooth' });
    });
});
//event listener for make a post button, scrolls the user down to the makepost div
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('goToPosts').addEventListener('click', function() {
        const targetDiv = document.getElementById('make_post_div');
            targetDiv.scrollIntoView({ behavior: 'smooth' });
    });
});

// waits until all the posts are loaded before listening for a keypress of Enter to trigger the search
document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('searchInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchText();
        }
    });
});

// function that searches text by user inputted keyword and returns posts containing keyword
async function searchText() {
    const query = document.getElementById(`searchInput`).value;
    const posts = document.querySelectorAll('.post');
    posts.forEach(post => {
        const postTextContent = post.textContent.toLowerCase();
        const found = postTextContent.includes(query.toLowerCase());
        post.style.display = found ? 'block' : 'none';
    });
    document.getElementById('sortOrder').style.display = query ? 'none' : 'block';

    if([...posts].every(post => post.style.display === 'none')) {
        document.getElementById("posts_box").innerText = 'No posts found matching your criteria.';
    }
}
