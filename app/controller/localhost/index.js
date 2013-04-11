var title = "DotsJS";
	content = "Welcome to this page served by DotJS, a simple NodeJS server.",
	time = Date.now() + " seconds since 1-1-1970.";
function filter(input, server, finish, res, req)
{
	input = input.split("{{title}}").join(title)
		.split("{{content}}").join(content)
		.split("{{time}}").join(time);
		
	var headers = {};
	headers["Access-Control-Allow-Origin"] = "*";
	headers["Access-Control-Allow-Headers"] = "X-Requested-With";
	
	// Send the input back, don't cache it, and send the custom headers with it.
	finish(input, false, headers);
}
module.exports.filter = filter;
