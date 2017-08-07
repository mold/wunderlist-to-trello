window.WTT = {};
(function(WTT) {
	// console.log(WTT);

	var lists;

	WTT.getTrello = function(key) {
		return $.getScript("https://api.trello.com/1/client.js?key=" + key, function(script, status) {
			return WTT.auth();
		})
	}

	WTT.auth = function() {
		Trello.authorize({
			type: 'popup',
			name: 'Wunderlist→Trello',
			scope: {
				read: 'true',
				write: 'true'
			},
			expiration: '1hour',
			success: function authSuccess() {
				alert("Authentication successful!");
			},
			error: function(e) {
				alert("Auth failed :( bye")
			}
		});
	}

	WTT.toggleTasks = function() {
		$(".outer-task").toggle();
	};

	WTT.export = function() {
		if (!window.Trello) {
			WTT.getTrello().then(function() {
				alert("try again :)");
			});
			return;
		}

		var idBoard = $("#board-id").val(),
			includeCompleted = $("[name=include-completed]")[0].checked;

		// get "real" idBoard
		Trello.get("/boards/" + idBoard).then(function(data) {
			idBoard = data.id;

			var newLists = [];
			lists.forEach(function(l, li) {
				Trello.post("/lists/", {
					name: l.title,
					idBoard: idBoard,
				}, (function(data) {
					var l = this;
					newLists.push(data.id);

					l.tasks.forEach((function(t, ti) {
						var data = this;

						if (t.completed && !includeCompleted) {
							console.log("skip task: ", t)
							return;
						}

						// max 10 requests per s
						window.setTimeout(_postTask.bind(null, {
							name: t.title,
							idList: data.id,
							desc: "https://www.wunderlist.com/#/tasks/" + t.id,
						}), li * ti * 100);
					}).bind(data));
				}).bind(l), function(resp) {
					alert("Trello API error: ");
				});
			})
		})

		return false;
	}

	function _postTask(task, count) {
		var count = parseInt("0" + count);
		console.log("try numbeR: ", count);
		Trello.post("/cards/", task, function success() {
			// create checklist for subtasks here
		}, function error(resp) {
			if (resp.status !== 429 || count > 3) {
				// error is not rate limit exceeded, so stop
				alert("Failed to add task " + JSON.stringify(task) + ", aborting");
			} else {
				window.setTimeout(_postTask.bind(null, task, count + 1), 1000);
			}
		});
	}

	WTT.parseJSON = function() {
		_jsonToLists($("#wunderlist-json").val());
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

	function _jsonToLists(json) {
		var obj = JSON.parse(json);

		var lists_o = {}; // lists "indexed" by id
		var lists_a = []; // lists as array

		obj.data.lists.forEach(function(l) {
			l.tasks = {};
			l.index = lists_a.length;
			lists_o[l.id] = l;

			l_a = JSON.parse(JSON.stringify(l));
			l_a.tasks = [];
			lists_a.push(l_a);
		})

		var tasks = {};
		obj.data.tasks.forEach(function(t) {
			t.subtasks = [];
			lists_o[t.list_id].tasks[t.id] = t;
			tasks[t.id] = t;

			lists_a[lists_o[t.list_id].index].tasks.push(t);
		});

		obj.data.subtasks.forEach(function(st) {
			tasks[st.task_id].subtasks.push(st);
		})

		sortByUncompleted(lists_a);

		lists_a.forEach(function(l) {
			var li = $("<li>").text(l.title)
			var ul = $("<ul>").appendTo(li);

			l.tasks.forEach(function(t) {
				var t_li = $("<li>")
					.text((t.completed ? "✔ " : "") + t.title)
					.addClass("task outer-task" + (t.completed ? " completed" : ""));
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

		return lists = lists_a;
	}
})(window.WTT);