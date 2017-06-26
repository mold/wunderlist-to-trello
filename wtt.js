(function(WTT) {
	// console.log(WTT);

	var lists;

	WTT.auth = function() {

		Trello.authorize({
			type: 'popup',
			name: 'Wunderlist→Trello',
			scope: {
				read: 'true',
				write: 'true'
			},
			expiration: '1hour',
			success: authenticationSuccess,
			error: function(e) {
				alert("Auth failed :( bye")
			};
		});
	}

	WTT.toggleTasks = function() {
		$(".task").toggle();
	};

	WTT.export = function() {
		if (!window.Trello) {
			WTT.getTrello().then(function() {
				alert("try again :)");
			});
			return;
		}

		var idBoard = $("#board-id").val();

		// get "real" idBoard
		Trello.get("/boards/" + idBoard).then(function(data) {
			idBoard = data.id;

			var newLists = [];
			lists.forEach(function(l) {
				Trello.post("/lists/", {
					name: l.title,
					idBoard: idBoard,
				}, (function(data) {
					var l = this;
					newLists.push(data.id);

					l.tasks.forEach((function(t) {
						var data = this;
						Trello.post("/cards/", {
							name: t.title,
							idList: data.id,
							desc: "https://www.wunderlist.com/#/tasks/" + t.id,
						})
					}).bind(data));
				}).bind(l));
			})
		})

		return false;
	}

	function sortByUncompleted(lists) {
		lists.forEach(function(l) {
			l.tasks.sort(function(a, b) {
				if (a.completed && !b.completed) {
					return 1;
				} else if (!a.completed && b.completed) {
					return -1;
				} else {
					return 0;
				}
			})
		})
	}

	///////
	$.get("wunderlist-20170626-16-40-20.json").then(function(a) {

		var lists_o = {}; // lists "indexed" by id
		var lists_a = []; // lists as array

		a.data.lists.forEach(function(l) {
			l.tasks = {};
			l.index = lists_a.length;
			lists_o[l.id] = l;

			l_a = JSON.parse(JSON.stringify(l));
			l_a.tasks = [];
			lists_a.push(l_a);
		})

		var tasks = {};
		a.data.tasks.forEach(function(t) {
			t.subtasks = [];
			lists_o[t.list_id].tasks[t.id] = t;
			tasks[t.id] = t;

			lists_a[lists_o[t.list_id].index].tasks.push(t);
		});

		a.data.subtasks.forEach(function(st) {
			tasks[st.task_id].subtasks.push(st);
		})

		// console.log(lists_o);
		// console.log(lists_a);

		sortByUncompleted(lists_a);

		lists_a.forEach(function(l) {
			var li = $("<li>").text(l.title)
			var ul = $("<ul>").appendTo(li);

			l.tasks.forEach(function(t) {
				var t_li = $("<li>")
					.text((t.completed ? "✔ " : "") + t.title)
					.addClass("task" + (t.completed ? " completed" : ""));
				ul.append(t_li);

				if (t.subtasks.length > 0) {
					var st_ul = $("<ul>").appendTo(t_li);
					t.subtasks.forEach(function(st) {
						$("<li>")
							.text((st.completed ? "✔ " : "") + st.title)
							.addClass("task subtask" + (st.completed ? " completed" : ""))
							.appendTo(st_ul);
					})
				}
			});

			$("#wunderlist-lists").append(li);
		});

		lists = lists_a;
	})
})(window.WTT);