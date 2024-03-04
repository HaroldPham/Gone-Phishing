async function init(){
    await loadIdentity();
    loadUserInfo();
}

async function loadUserInfo(){
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');

    let userJson = await fetchJSON(`api/users/reputationScore?username=${username}`);

    document.getElementById("username-span").innerText = username;
    if (userJson.status == "nocontent") {
        document.getElementById("reputation-score-span").innerText = "0";
    } else {
        document.getElementById("reputation-score-span").innerText = userJson.reputation_score.toString();
    }

    loadUserInfoPosts(username)
}


async function loadUserInfoPosts(username){
    document.getElementById("posts_box").innerText = "Loading...";
    let postsJson = await fetchJSON(`api/posts?username=${encodeURIComponent(username)}`);
    if (username != myIdentity) {
        postsJson = postsJson.filter(postInfo => {
            return !postInfo.anonymous;
        });
    }
    let postsHtml = postsJson.map(postInfo => {
        let image;
        if (postInfo.image.data != undefined) {
            let imgBase64 = btoa(
                postInfo.image.data.data.reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            let imageSrc = `data:image/${postInfo.image.contentType};base64,${imgBase64}`;
            image = `<img style="max-width: 280px; display: block; margin: auto;" src="${imageSrc}">`;
        } else {
            image = 'no image';
        }

        return `
        <div class="post">
            <div class="postHeader">
                <div class="username">
                    <h3>Username:  ${!postInfo.anonymous ? `<a href="/userInfo.html?user=${encodeURIComponent(postInfo.username)}" class="username">${escapeHTML(postInfo.username)}</a>` : "Anonymous" }</h3>
                </div>
                <h5>Posted on: ${escapeHTML(postInfo.created_date)}</h5>
            </div>
            <div class="postInfoDisplay"> <!--Put the info fields from above in this div.-->
                <h3>What Happened</h3>
                <p>${escapeHTML(postInfo.description)}</p>
                <p>${image != null ? image : ''}<br></p>

                <h3>Phish Details</h3>
                <p>
                <ul>
                    ${postInfo.scam_date ? `<li>Scam Date: ${escapeHTML(postInfo.scam_date)}</li>` : ''}
                    ${postInfo.scam_type ? `<li>Scam Type: ${escapeHTML(postInfo.scam_type)} </li>` : ''}
                    ${postInfo.frequency ? `<li>Frequency (least 1-5 most): ${escapeHTML(postInfo.frequency.toString())} </li>` : ''}
                    ${postInfo.scammer_phone ? `<li>Scammer's Phone: ${escapeHTML(postInfo.scammer_phone)} </li>` : ''}
                    ${postInfo.scammer_email ? `<li>Scammer's Email: ${escapeHTML(postInfo.scammer_email)} </li>` : ''}
                    ${postInfo.org ? `<li>Who the scammer pretended to be: ${escapeHTML(postInfo.org)} </li>` : ''}
                </ul>
                </p>
            </div>
            <br>
            <div><button class="smaller-button" onclick='deletePost("${postInfo.id}")' class="${postInfo.username==myIdentity ? "": "d-none"}">Delete</button></div>
        </div>`
    }).join("\n");

    document.getElementById("posts_box").innerHTML = postsHtml;
}

async function deletePost(postID){
    let responseJson = await fetchJSON(`api/posts`, {
        method: "DELETE",
        body: {postID: postID}
    })
    loadUserInfo();
}