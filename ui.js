$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $favoriteStories = $("#favorited-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $mainNavLinks = $("#main-nav-links");
  const $navAddStory = $("#nav-add-story");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $userProfile = $("#user-profile");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  // *******************************************************************
  // Event handlers  and actions for the logged-in users navigation menu
  // *******************************************************************

  // Mark an story a user favorite and add to favorites
  $allStoriesList.on('click', '.fa-star', async function(evt) {
    // Get story id
    let storyId = $(evt.target).closest('li').attr('id');
    console.log('favorite story id', storyId);
    if ($(this).hasClass('far')) {
                  $(this).removeClass('far').addClass('fas');
                  console.log('Marked story a favorite')
                  await currentUser.addToFavorites(storyId);
    }
    else {
                  $(this).removeClass('fas').addClass('far');
                  console.log('Unmarked story a favorite')
                  await currentUser.removeFromFavorites(storyId);
    }
    $allStoriesList.show();
  })


  // Add a story menu item
  $navAddStory.on('click', function() {
    hideElements();
    $allStoriesList.show();
    $submitForm.show();
    // Get data from form
    $submitForm.on('submit', async function(evt) {
      evt.preventDefault(); // no page refresh
      let author = $('#author').val();
      let title = $('#title').val();
      let url = $('#url').val();

      let newStory = {author, title, url};
      console.log(newStory);
      let addedStory = await storyList.addStory(currentUser, newStory);

      let addedStoryHTML = generateStoryHTML(addedStory);
      $allStoriesList.prepend(addedStoryHTML);
      $submitForm.trigger('reset');
      $submitForm.hide('slow');
      
    })
  })

  // Delete an added story
  $ownStories.on('click', '.fa-trash-alt', async function(evt) {
    console.log('click on remove story button');
    let storyId = $(evt.target).closest('li').attr('id');
    console.log('Removing story ID: ', storyId);
    await storyList.deleteStory(currentUser, storyId)
  })
 
  // Display list of favorite stories
  $('.nav-link').on('click', '#nav-favorites', function() {
    console.log('clicked on favorite stories nav');
    hideElements();
    getFavoriteStories();
    $favoriteStories.show();
  })

  // Display stories added by currentuser
  $navMyStories.on('click', function() {
    console.log('clicked on my stories nav');
    hideElements();
    getMyStories();
    $ownStories.show();
  })

  // Display user profile information
  $navUserProfile.on('click', function() {
    createUserProfile();
    hideElements();
    $userProfile.show();
  })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();
   
    // update the navigation bar
    showNavForLoggedInUser();
    createUserProfile();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  // Selects stories submitted by current user
  function getMyStories() {
    
    let myStoryList = [];
    $ownStories.empty();

    myStoryList = storyList.stories.filter(story => 
                            story.username === currentUser.username);
    
    if (myStoryList.length > 0) {
      for(let story of myStoryList) {
        myStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(myStoryHTML);
      }
    }
    else {
      $ownStories.append('<h4>No Stories Added</h4>');
    }
  }

  // Selects favorite stories by current user

  function getFavoriteStories() {
    $favoriteStories.empty();

    if (currentUser.favorites.length === 0) {
      $favoriteStories.append('<h4>No Favorite Stories Selected</h4>');
    }
    else {
      for(let story of currentUser.favorites) {
        favoriteStoryHTML = generateStoryHTML(story);
        $favoriteStories.append(favoriteStoryHTML);
      }
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */
  //  TBD add functionality to check if a story is a favorite and
  //  add the appropriate star class. see isStoryFavorite(storyId)
  function generateStoryHTML(story, showDeleteIcon=false) {
    let hostName = getHostName(story.url);
    // add delete button (trash can icon)
    let deleteBtn = '';
    if (showDeleteIcon) {
      deleteBtn = `<i class='fas fa-trash-alt'></i>`;
    }
    // set default star type for class
    let starType = 'far';
    // check of story is a favorite upon login
    if (currentUser) {
      let isFavorite = currentUser.isStoryFavorite(story.storyId);
      // console.log(`(from ui.js)isFavorite? ${isFavorite}`);
      starType = isFavorite ? 'fas' : 'far';
      // console.log(`'Star Class set to ${starType} for ${story.title}`);
    }
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${deleteBtn}
        <i class="${starType} fa-star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }
  
  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favoriteStories,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    // Add user name to nav menu
    $navUserProfile.html(currentUser.username);
    $navWelcome.show();
    $navLogOut.show();
    $mainNavLinks.show();
    
  }

  // Make function to create (fill-in) user profile
  function createUserProfile() {
    $('#profile-name').text(`Name: ${currentUser.name}`);
    $('#profile-username').text(`User Name: ${currentUser.username}`);
    $('#profile-account-date')
      .text(`Account Created: ${currentUser.createdAt.slice(0,10)}`);
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
