
### Below is a list of points that provide feedback to the current live build. Please refer back to this document and update any sections that have been iterated on.

- Magic links for signing in are set to localhost:3000 rather than website URL. This is the same for password resets also. - BOTH NOW RETURN USER TO LIVE SITE - MAGIC LINK LOGS USER IN BUT DOESN'T ACTUALLY LOG THEM IN!
- Logo needs to be present on all of these pages (Log-in and related) as a banner so users have access to "home" page at all times, currently there is no way back. - SORTED BUT NEEDS SIZE AND PLACEMENT CONFIGURING
- Logo to be present as tab icon - WORKING ON IT 
- Is language and currency supposed to be a changeable thing, else why is it present in the footer? - THERE PURELY FOR EXPANSION DOWN THE LINE!


---- Admin Panel

- When warning, softbanning  or banning it needs to clearly state what its going to do in the pop up notification to the admin (e.g. warn says could restrict access, does it?)
- When banning and giving reasoning, can the user access their inbox to view the message and what is actually getting banned? Just the use of posting, booking, payouts etc. Finer controls required?
- Banning/warning coming soon?
- Is viewing their dashboard just ghosting, like virtual viewing or can I change things? Hopefully I can't - JUST GHOSTING
- Is it legal to be able to log in as the user? Is this completely secure? Can anyone else do this at any time? Could be very dangerous! panic panic panic - YES, NEEDS MENTIONING IN T&S
- Crashes when opening moderation section. Delayed crash too. - SHOULD BE SORTED
- Add part for moderation and safety where when we look up a profile it gives some information in another panel about trust score and amount of times flagged, warned, banned etc. - SORTED BUT NEEDS MORE INFORMATION AND DATA
- Create badges tied to just typing a description? Like rewarding people we feel like and they don't come up in the attainable sections when people check, like hidden mystery ones? - SORTED
- Referral probably shouldn't give cash incentives as that comes out of our bank account and would have to be fed from a live holding wallet. It should probably be tied to fees as well. - SORTED, THIS WAS AN OVERLOOKED MISTAKE
- Can we have a way to mark some feedback as important, so a card up top for important ticker and a filter option to show only important marked. This will allow us to divide content up as to what might be deemed useful to know for a later date or for revision rather than some crap from an old granny not working the website well. - SORTED
- Loving the news section, but can we make it so the image can be an upload with cropping and size guides rather than a URL and can we have the text boxes work with markdown or a button to show its formatted variant? Obvs we would post it not published before getting it right, but can we actually preview it yet before its published? (the urls dont work for images, but the html formatting works beautifully.) - SORTED, NEWS CAN BE PREVIEWED AND THERE IS NOW A STORAGE BUCKET SPECIFICALLY FOR NEWS IMAGES, CROPPING AND SIZING MIGHT NEED CONFIGURING - DISPLAY IS NOT QUITE RIGHT FOR NEWS SEGMENTS, AS WELL AS TOP BAR

---- Badges 

- Can we make referral impactful by allowing discounted fees for each referral in some way? This will make it a reason to do it. e.g. half price fees or something on next booking, and obviously it will track and stack. - IT TRACKS AND STACKS FOR THE REFERER - SEE NEW EXPLANATION FOR FULL RUN DOWN IN CHANGELOG 2026/01/29
- Not entirely sure about common and rare status on badges, but the bronze, silver, gold and platinum can stay. We don't want to make it obviously gameified, horsey people aren't gamblers or gamers unless its the national races! - YOU'RE RIGHT, THEY SUCK. WE HAVE NOW MOVED TO BRONZE, SILVER ETC
- Why are there points? What do these do? - THEY HAVE NOW BEEN REMOVED
- Badges are being unlocked but not rewarded properly, also not showing up in recent rewards as unlocked

---- Profile

- Can't change name and email for a reason I guess because its verified to be you, but what about phone number and does it need to be there at all? Are we using it for verification? - THESE CHANGES ARE UP TO YOU, I THINK IT'S BETTER TO KEEP EMAIL AND THEY CAN MESSAGE US PRIVATELY IF IT REALLY NEEDS CHANGING AND WE CAN MANUALLY CHANGE IT WITHIN DATABASE? WILL SORT CHANGING NAME. PHONE NUMBER IS THERE FOR HOSTS AND GUESTS TO CONTACT EACH OTHER.
- NAME CHANGE NOW WORKS, USERS ARE LIMITED TO 3 NAME CHANGES A MONTH
- Do we actually have any cookies and analytics going on at all? As its not really a live site I'm guessing we haven't hooked it up to google analytics or anything? - CURRENTLY NO, POP UP IS JUST IN PLACE, IS READY FOR IMPLEMENTATION WHENEVER - SEEMS RELATIVELY EASY TO CONFIGURE
- Note for uploading profile picture on size next to upload, way of adjusting to square different sizes? Likewise on uploading horse images too, what size, how does it scale etc. Options to crop images before its uploaded via the website? - CROPPING NOW IMPLEMENTED, AND SIZING SORTED
- Can't remove poopy bum for work or favourite song in school (weird ass thing to have there mate.) Actually - I don't think it really updates properly as I change things and they aren't there. - They are on profile view but not in my own profile settings or account page. - JUST COPIED WHAT AIRBNB HAVE, I KNOW IT'S STRANGE - SAVES SHOULD CHANGE PROPERLY AND WEIRD ONES ARE SORTED OUT
- Private horses are greyed out but the menu buttons should not be
- public/private toggle on the horse card without opening?
- I want to be able to choose to display whichever badge I want in miniature next to my profile picture, so other users can see from a glance that I am X. This could create senior and sensible community moderators etc.

---- messages

- Security pop up needs a bit of space between it and the first message as they are touching until dismissed - SHOULD BE SORTED
- Stuff isn't quite displayed properly in the messages section, some boxes overlapping etc - NEEDS WORK

---- Routes

- Adding hazards it says done by anonymous, is that because i'm an admin? How come jaspers worked with his name?
- Maps doesn't load, javascript error. It says referrer not allowed and site URL needs to be authorized. - SORTED, ALL URLS ARE NOW AUTHORISED 
- Can't make a route as no map interface even loads, not even a grey box - SHOULD BE SORTED
- Need to make the create route box adjustable in size by dragging as it's currently tiny and requires loads of scrolling. Start it at 50% of Vh
- Properties toggle is great but also have one for made routes, as I can't find any on there.
- I can't actually look at any routes, only seems to do information popup and then let me edit route to make my own version.
- Where are the reviews for routes?
- WHen uploading picture there needs to be a dialog to say upload success as theres a delay in the photo being available and people will upload over and over again. Maybe the dialog says "may take a few minutes for image to show"
- I can change all the photo stuff and set cover images etc, can other people or is it only the user who made it that can do it (Thats how it should be)
- Might need a way to adjust styles for the toggle layers too in a compact manner (satellite makes it very hard to see bridleway colour)
- Snapping is working loads better, but needs a minimum distance for snapping, as if i drag it in the middle of a field it snaps 100m away! Users will be clicking near where they want it most the time so it doesn;t need to go far when dropping waymarker
- Snapping pathmaking does some very weird thing, it seems to take weird routes using other paths rather than following the logical path its already got a waypoint on
- Waypoints seem to have priority snapping to paths over road, making it hard to drop a marker between paths even if they are hundreds of metres away
- route pathfinding seems to have a limit on taking a paths shape and just draws a straight line after a while.
- pathfinding doesn't seem to work on roads, which is important as a lot of the route will nearly always feature roads
- inserting a waymarker doesn;t actually insert it where you click, this needs to respond to where on the line, or a close proximity to where a user clicks (I think this is related to the overstrong snap mechanic, adjusting this might fix this issue straight away)
- google maps interface needs to be removed, it completely breaks the one built ontop. A full screen button of our own needs to be designed into it.
- Once a linear is made circular it doesn;t seem to be possible to undo it, and pressing undo only removes the points but not the fact it connected.
- Deleting start points can make some weird things happen when reinserting points at the end (reinserting points just before hitting start again seems to make new points from start, which really jostles things around confusingly, it can be worked around with but its not quiet right)
- Adding waypoints is interesting, but whats the point in it if i can;t see where the waypoints are or the map with them on? I need to be able to see the route in an overview with all markers on it, hazards and waypoints - also can't edit waypoints or flag them. I think all these things should have the flag ability.
- Clicking a users profile from routes just takes me to my dashboard, it seems to mess up a bit and try and do the profile momentarily. Then it goes to my blank dashboard. We need to be careful to test as guests and hosts as admins will have different links generated when navigating.
- hazards can't be flagged - what if its wrong now and its not the case and I want to comment on it to say its better?
- Having photos is cool but I can't atually view them. When I click one I want it to open up bigger on the screen and let me browse through them to navigate. Also a comment on the bottom of it in a half opacity bar saying like "scruffles loves his muddy walks"
- Why can't other people upload photos to the routes? It's meant to be a community action
- delete a discussion post does not seem to work
- How does anyone say they have completed a route, this is super important. Almost as important as being able to see the route!
- there is no review system

---- Host/Property

- There was no confirmation, it just let me be a host the minute I clicked the link and gave a dialog box to confirm.
- Description set at minimum 200 characters?
- Can distance to bridleway be worked out automatically? make it just a tick box, who is gonna go measure it all up? also M can be confusing for miles or metres.
- Won't let me upload photos for the stable for making a stay - likely because of file type. It should say max file size, dimensions preferred (cropping available?) and file types.
- Hosts should be able to view their own listings before validation in a way where they will see it properly presented rather than just via draft edit settings.
- I can set £10 a night but filter in search only goes to 50 minimum. These need to match.
- Some weird things going on with editing property information and trying to save it, crawling through options again threw out some mad errors at the base of the listing that I then managed to negate by skipping forward in the process as i couldn't continue
- How long does the new badge last on a property? what other badges are assigned to a property



ROUTE CHANGES

- Full screen map makes the whole website full screen, if you link away it's all still full screen. This might confuse older or less technically capable users.
- love the nearby property bit, but when clicking it - make sure it takes the map to the properties pin with its information box, rather than link to the property page. We want to keep people on the maps page and only leave if they've confirmed that, such as then clicking the property pop up window again.
- The route pins aren't actually in the location of the routes, if you click the pin it shows the example route in the wrong place.
- clicking a route zooms in great, but clicking edit takes you all the way out again. It needs to maintain the view they are on or zoom in to the same as when clicking the route pin. In fact, I think it takes you to the old set up and its all a bit broken
- We really need to remove the google map control interface, especially as the our one is much better now!
- If I click edit route, it seems to be gone now.
- clicking the route zooms in to it and shows its example, but the route is more simple and the geometry isn't what was actually drawn, its just straight lines between waypoints rather than the shape saved with the snapping.
- We need a completed button present when you click the route.
- Search bar should allow typing in the address and then it shows all routes within X distance from it (Or says no routes available, want to make a route?)
- What is the pins section within the new menu pulldown (Which is great by the way)
- Rather than the way osmaps does it on pc, we should copy the mobile version. Clicking the pin should bring the card up at the bottom of the screen (this allows scrolling through by finger or arrows if there are multiple on the pin) - When clicking the pin it should overlay the route straight onto the map. I don't want to see a small dialog and then have to go into a deeper menu to see where it goes, I want immediate feedback and then i can make my mind up straight away if it's suitable. This will be much better and snappier. If it looks good, then I'll want to find out more information by clicking the card. (Also the pop up box covers the map view right over where you are looking which makes no sense.)
- Information box needs new layout. Pictures at the base, as they are least important. Most important information is difficulty, distance, time etc which should be more visible - bigger like osmaps.
- We need to remove the star rating - it disincentivizes properties if their routes aren't as good and we want people to stay to make money.
- IMPORTANT - Information panel is clunky with the option headers for discussion, hazards etc. - Remove photos, we will just have them at the base anyway so not needed. Also remove stays, as this should also have its own card like photos to scroll through available places (The current card is perfect - just make it already present) Overview should also already be there, not in a selection and its only a small card so not an issue to scroll. Discussion should be a small card that says, see what people are saying, shows the most recent post on the card and clicking it moves the window to the discussion thread that now takes up the whole panel with a back button. REVIEWS SHOULD ALSO WORK LIKE THIS. There should be a reviews section that also takes up the whole panel and has a back button. That just leaves  waypoints and hazards - These should be coupled with a few other icons, similar to OSMaps like report route, download GPX (Remove the big button for it, (*we want people to stay on our site really, not take it externally so bury it here*), Copy and Edit route *(Which tags the new edited route as a variant if it's saved and published)*, See Variants *(Shows published variants of this route and collates them here to prevent mess)* 
- Split information panel photos to author photos and community photos. Swipe through them and clicking them brings them up larger with caption.
- location services is not active. Love the need to be near to drop a hazard, but I am and its not working. It should ask for permission from the computer or phone - GPS wants to be working for doing a route (We can add this later)
- Discussion might be chaotic, we will have to see.
- Reviews collect information about these routes, this is then used to display tags alongside the data parts nearer the top as these will be helpful and important. They should also be displayed at the base of the review as tags so people can easily see them. - CHECK OUT THE OTHER DOCUMENTS SUCH AS ROUTE MAKING AND CONTRIBUTIONS TO SEE HOW THE REVIEW FLOW CARDS WORK.
- Eventually it would be really good to have the POI data working, so in the search bar i can type locations and I go to it, or loose address information for finding pubs etc. 
- A toggle for Points of Interest up top, near the seach bar would be good, so that pubs can be seen and clicked on and a small card is displayed, like route pins that gives some general google maps info, like opening hours, star review power and address etc. This goes for other points of interest too.
