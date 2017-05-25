$.fn.musicPlayer = function(){
	var $audio = this.find("audio"),
		audio = $audio.get(0),
		$turn = this.find(".turn"),
		$next = this.find(".next"),
		$play = this.find(".play"),
		$pause = this.find(".pause"),
		$current = this.find(".current"),
		$total = this.find(".all"),
		$title = this.find("header h1"),
		$singer = this.find(".singer"),
		$like = this.find(".like"),
		$img = this.find("main img"),
		$progress = this.find(".progress"),
		$render = $progress.find(".render"),
		$category = this.find(".category"),
		progress = $progress.get(0),
		$lyric = this.find(".lyric"),
		$top = parseInt($lyric.css("top")),
		clock;
	getChannel();
	$play.on("click",function(){
		play();
	});
	$pause.on("click",function(){
		pause();
	});
	$like.on("click",function(){
		var self = $(this);
		if(self.hasClass('active')){
			self.removeClass('active');
		}else{
			self.addClass('active');
		}
	});
	$turn.on("click",function(){
		getChannel();
	});
	$next.on("click",function(){
		getSong();
	});
	function play(){
		audio.play();
		$play.hide();
		$pause.show();
		playProgress();
	}
	function pause(){
		audio.pause();
		$play.show();
		$pause.hide();
		pauseProgress();
	}
	function getChannel(){
		$.ajax({
			url:'http://api.jirengu.com/fm/getChannels.php',
			dataType:'json',
			Method:'get',
			success:function(response){
				// var response = JSON.parse(response);
				var channels = response.channels;
				var num = Math.floor(Math.random()*channels.length);
				var channelId = channels[num].channel_id;
				$category.text(channels[num].name);
				$category.attr('data-id',channelId);
				getSong();
			}
		});
	}
	function getSong(){
		$.ajax({
			url: "http://api.jirengu.com/fm/getSong.php",
			dataType: 'json',
			Method: 'get',
			data:{
				'channel': $category.attr('data-id')
				// 'version':100,
				// 'type':'n'
			},
			success: function (ret){
				var resource = ret.song[0],
					url = resource.url,
					bgPic = resource.picture,
					sid = resource.sid,
					ssid = resource.ssid, // 歌词数据
					title = resource.title,
					author = resource.artist;
				$audio.attr("src",url);
				$audio.attr('sid',sid);
				$audio.attr('ssid',ssid);
				$title.text(title);
				$singer.text(author);
				$img.attr("src",bgPic);
				play();
				getlyric();
			}
		})
	}
	function getlyric(){
		$.post('http://api.jirengu.com/fm/getLyric.php', {ssid: $audio.attr("ssid"), sid: $audio.attr("sid")}).done(function(response){
			var response = JSON.parse(response);
			if(!!response.lyric){
				$lyric.empty();
				var Instance = response.lyric.replace(", by 饥人谷","");
				var lyricArr = Instance.split("\n");
				var Reg = /\[\d{2}:\d{2}.\d{2}\]/g;
				var Obj = {};
				for(i in lyricArr){
					var time = lyricArr[i].match(Reg);
					if(!time) continue;
					var lyric = lyricArr[i].replace(Reg,"");
					Obj[time] = lyric;
				}
				render(Obj);
			}else{
				$lyric.empty();
				$lyric.text("歌词暂未收录...");
			}
		})
	}
	// function sequence(node){
	//   var $node = $(node);
	//   for(var i = 0;i < $node.length;i++){
	//     $node.eq(i).attr("data-time");

	//   }
	// }
	function render(lyric){
		var node = "";
		for(var key in lyric){
			node += '<li data-time="' + key + '">' + lyric[key] + '</li>';
		}
		// var $node = sequence(node);
		var $node = $(node);
		$node.appendTo($lyric);
		setInterval(function(){
			for(var i = 0;i < $node.length;i++){
				var ctime = audio.currentTime;
				var timeStr = $node.eq(i).attr("data-time");
				var timeStr2 = $node.eq(i+1).attr("data-time");
				var time = parseInt(timeStr.slice(1,3)) * 60
					+ parseInt(timeStr.slice(4,6))
					+ parseInt(timeStr.slice(7,9))/60;
				if(!!timeStr2){
					var time2 = parseInt(timeStr2.slice(1,3)) * 60
						+ parseInt(timeStr2.slice(4,6))
						+ parseInt(timeStr2.slice(7,9))/60;
					if(ctime < time && time2 > time){
						if($node.eq(i - 1).hasClass('active')) return;
						$node.removeClass("active").eq(i - 1).addClass("active");
						renderHeight($node.eq(i));
						return;
					}
				}else{
					if(ctime < time){
						if($node.eq(i - 1).hasClass('active')) return;
						$node.removeClass("active").eq($node.length - 1).addClass("active");
						var topn = parseInt($lyric.height()) - 16;
						$lyric.css("top",topn);
						return;
					}
				}
			}},300);
	}
	function setProgress(){
		var currentTime = audio.currentTime,
			curMin = Math.floor(currentTime/60),
			curSec = Math.round(currentTime%60),
			duration = audio.duration,
			allMin = Math.floor(duration/60),
			allSec = Math.round(duration%60);
		if(curSec < 10){
			curSec = "0" + curSec;
		}
		if(allSec < 10){
			allSec = "0" + allSec;
		}
		var allStr = allMin + ":" + allSec;
		var curStr = curMin + ":" + curSec;
		var pwidth = parseInt($progress.css("width"))
		var $width = currentTime/duration * pwidth;
		$render.css("width",$width);
		$current.text(curStr);
		if($total.text() !== allStr && allStr !== "NaN:NaN"){
			$total.text(allStr);
		}
		if($width >= pwidth){
			getSong();
		}
	}
	function playProgress(){
		clock = setInterval(function(){
			setProgress();
		},1000);
	}
	function pauseProgress(){
		clearInterval(clock);
	}
	$progress.on("click",function(e){
		var posX = e.clientX;
		var targetLeft = $(this).offset().left;
		var percentage = (posX - targetLeft)/parseInt($progress.css("width"));
		audio.currentTime = audio.duration * percentage;
		for(var i = 0;i < $lyric.find("li").length;i++){
			if($lyric.find("li").eq(i).hasClass('active')){
				var self = $lyric.find("li").eq(i);
				break;
			}
		}
		renderHeight(self);
	});
	$lyric.on("click","li",function(){
		var $this = $(this);
		var timeStr = $this.attr("data-time");
		var time = parseInt(timeStr.slice(1,3)) * 60
			+ parseInt(timeStr.slice(4,6))
			+ parseInt(timeStr.slice(7,9))/60;
		audio.currentTime = time;
		renderHeight($this);
	})
	function renderHeight(self){
		var $hei = 0;
		for(var i = 0;i < self.index();i++){
			$hei += $lyric.find("li").eq(i).outerHeight(true);
		}
		if(self.index() === -1) return;
		var top1 = $top - $hei;
		$lyric.css("top",top1);
	}
}
// })(jQuery)
$(".poster").musicPlayer();