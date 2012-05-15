var users = [{
		username : 'keith',
		fullname: 'Keith Howling',
		points: 50,
		belongs_to_primary: '_id';
		belongs_to_also: [
			'_id',
			'_id'
			],
		following: {[
				'groupaa',
				'userab'
		]}
		picture_url: '', 
		completed_events: {},
		booked_training: {}
},
{
    	username : 'jim',
		fullname: 'Jim Smit',
		points: 50,
		belongs_to_primary: '_id';
		belongs_to_also: [
			'_id',
			'_id'
			],
		following: {[
				'groupaa',
				'userab'
		]}
		picture_url: '', 
		completed_events: {},
		booked_training: {}
}];
for (i in users) { db.users.insert(users[i]); }


var groups = [{
		name: 'T-Mobile Maidenhead',
		type: 'group', //'class', 'outlet' etc,
		description: 'T-Mobile',
		picture_url: '/';
		members: [
			'_id'
			'_id']
}];
for (i in groups) { db.groups.insert(groups[i]); }

var posts = {[
		userid: '123',
		parentid: 'groupid',
		body: {
			text: 'hi',
			attachments: {}
		}
		likes: [ 'uid1', 'uid2' ]
}
		
var e = [{
    _id: 'K000', 
	type: "KNOWLEDGE",
	name: "Start Here  *** The Basics  ***",
	desc: "Portal Training",
	info: "HTML5 Video Stream",
	icon: "images/icons/gettingstarted.jpg",
	forwho: { completed : {}},
	points: 50,
	knowledgedata: {
		url: 'http://nokiaknowledge2.herokuapp.com'+'/stream/myvid.mp4',
		type: 'HTML5_VIDEO'
	}
},
{
    _id: 'K001', 
	type: "KNOWLEDGE",
	name: "Just a Test",
	desc: "HTML5 streaming from node",
	info: "HTML5 Video Stream",
	forwho: { completed : {}},
	points: 50,
	knowledgedata: {
		url: 'http://nokiaknowledge2.herokuapp.com'+'/stream/gizmo.webm',
		type: 'HTML5_VIDEO'
	}
},
{
    _id: 'K002', 
	type: "KNOWLEDGE",
	name: "Nokia Lumia 710",
	desc: "Basic Phone Demo Training",
	info: "YouTube Embedded Video",
	icon: "images/icons/nokia-710.png",
	forwho: { completed : { 'Q001':true}},
	points: 50,
	knowledgedata: {
		url: 'http://www.youtube.com/embed/0NvgOOY7gJM',
		type: 'EMBEDDED_IFRAME'
	}
},
{
    _id: 'K003', 
	type: "KNOWLEDGE",
	name: "Windows Phone 7",
	desc: "Presenting Training",
	info: "YouTube Embedded Video",
	icon: "images/icons/WP7.jpg",
	forwho: { completed : {}},
	points: 50,
	knowledgedata: {
		url: 'http://www.youtube.com/embed/cBISUhRIiSE',
		type: 'EMBEDDED_IFRAME'
	}
},
{
    _id: 'Q001', 
	type: "QUIZ",
	name: "Getting Started",
	desc: "Your 1st Quiz",
	intro: "Take this Quiz just to get you familiour with our portal",
	forwho: { completed : {}},
	points: 500,
	quizdata: {
		"multiList":[
			{ 
				ques: "What mobile operating system does the Nokia Lumia 800 run?",
				ans: "Windows",
				//ansInfo: "<a href='http://heroku.com'>heroku</a> PaaS.",
				ansSel: [ "iOS", "Android", "webos" ],
				retry: 0 	// The question can only be tried twice. Otherwise the user's answer is wrong.
			},
			{ 
				ques: "Which country is Nokia based?", 
				ans: "Finland",
				//ansInfo: "<a href='http://en.wikipedia.org/wiki/Ottawa'>The City of Ottawa</a> is where the capital of Canada.",
				ansSel: [ "England", "Germany", "America" ]
		//		ansSelInfo: [
		//			"Hanoi is the capital of Vietnam", 
		//			"Washington, D.C. is the capital of the USA"
		//		]
			}
		]
	}
},
{
    _id: 'Q002', 
	type: "QUIZ",
	name: "Nokia Lumia 800",
	desc: "Sales assistant general (level1)",
	forwho: { completed : {'Q001':true}},
	points: 5000,
	quizdata: {
		"multiList":[
			{ 
				ques: "Can you pre-order the Nokia Lumia 800 in White?",
				ans: "Yes",
				ansSel: [ "No" ],
				retry: 0
			},
			{ 
				ques: "What Camera does the 800 feature?", 
				ans: "8 MP Auto Focus with Carl Zeiss Optics,",
				ansInfo: "8 MP Auto Focus with Carl Zeiss Optics, 2x LED Flash and HD Video",
				ansSel: [ "No Camera", "2 MP webcam", "12 MP, x30 Optical zoom" ]
			},
			{ 
				ques: "What display size does the 800 feature?", 
				ans: '3.7" 480x800 pixels',
				ansInfo: "Corning� Gorilla� Glass, AMOLED, ClearBlack, Curved glass",
				ansSel: [ '3.5" 960x640  pixels', '10.1" 1080x800 pixels' ]
			}
		]
	}
},
{
    _id: 'Q003',
	type: "QUIZ",
	name: "Windows Mobile OS",
	desc: "Business Specification (level5)",
	forwho: { completed : {'Q001':true}},
	points: 5000,
	quizdata: {
		"multiList":[
			{ 
				ques: "What office applications comes with Windows Mobile",
				ans: 'Word, Excel, OneNote and PowerPoint',
				ansSel: [ 'Word', 'Word and Excel', 'Word, Excel and OneNote' ],
                retry: 0    // The question can only be tried twice. Otherwise the user's answer is wrong.
			},
			{ 
				ques: "Can you create linked inboxes with Outlook Mobile?", 
				ans: "Yes",
				ansInfo: "If you have lots of accounts, you can create linked inboxes to streamline things, for example one for personal emails and one for work (the accounts stay separate)",
				ansSel: [ "No" ]
				//ansSelInfo: [
				//	"Hanoi is the capital of Vietnam", 
				//	"Washington, D.C. is the capital of the USA"
				//]
			}
		]
	}
}];

for (i in e) { db.events.insert(e[i]); }
