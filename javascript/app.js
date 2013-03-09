(function() {
  var fs, gui, home_dir, ncp, node, path, storage_dir, util;

  try {
    gui = require('nw.gui');
    fs = require('fs');
    path = require('path');
    ncp = require('ncp').ncp;
    util = require('util');
    node = true;
    home_dir = process.env.HOME;
    if (process.platform === "darwin") {
      storage_dir = path.join(home_dir, "/Library/Application Support/Noted/");
    } else if (process.platform === "win32") {
      storage_dir = path.join(process.env.LOCALAPPDATA, "/Noted");
    } else if (process.platform === "linux") {
      storage_dir = path.join(home_dir, "/.config/Noted/");
    }
  } catch (e) {
    console.log("ERROR:\nType: " + e.type + "\nArgs: " + e.arguments + "\nMessage: " + e.message);
    console.log("\nSTACKTRACE:\n", e.stack);
  }

  window.noted = {
    selectedList: "all",
    selectedNote: "",
    setupPanel: function() {
      var win;
      win = gui.Window.get();
      win.show();
      win.showDevTools();
      $('#close').click(function() {
        return win.close();
      });
      $('#minimize').click(function() {
        return win.minimize();
      });
      $('#maximize').click(function() {
        return win.maximize();
      });
      $('#panel').mouseenter(function() {
        return $('#panel').addClass('drag');
      }).mouseleave(function() {
        return $('#panel').removeClass('drag');
      });
      return $('#panel #decor img, #panel #noteControls img, #panel #search').mouseenter(function() {
        return $('#panel').removeClass('drag');
      }).mouseleave(function() {
        return $('#panel').addClass('drag');
      });
    },
    setupUI: function() {
      $("#content header .edit").click(function() {
        if ($(this).text() === "save") {
          $(this).text("edit");
          $('.headerwrap .left h1').attr('contenteditable', 'false');
          window.noted.editor.save();
          return window.noted.editor.preview();
        } else {
          $(this).text("save");
          $('.headerwrap .left h1').attr('contenteditable', 'true');
          return window.noted.editor.edit();
        }
      });
      $("body").on("click", "#notebooks li", function() {
        $(this).parent().find(".selected").removeClass("selected");
        $(this).addClass("selected");
        window.noted.loadNotes($(this).text());
        return window.noted.deselectNote();
      });
      $("body").on("contextarea", "#notebooks li", function() {
        window.noted.editor.remove('file');
        return fs.rmdir(path.join(storage_dir, "Notebooks", window.noted.selectedList), function(err) {
          if (err) throw err;
          window.noted.deselectNote();
          return window.noted.loadNotebooks;
        });
      });
      $('body').on("keydown", "#notebooks input", function(e) {
        if (e.keyCode === 13) {
          e.preventDefault();
          fs.mkdir(path.join(storage_dir, "Notebooks", $('#notebooks input').val()));
          window.noted.listNotebooks();
          $('#notebooks input').val("");
          return setTimeout((function() {
            return $('#notebooks input').blur();
          }), 50);
        }
      });
      $("body").on("click", "#notes li", function() {
        $("#notes .selected").removeClass("selected");
        $(this).addClass("selected");
        return window.noted.loadNote($(this));
      });
      $("body").on("keydown", ".headerwrap .left h1", function(e) {
        if (e.keyCode === 13) {
          e.preventDefault();
          return $(this).blur();
        }
      });
      $("body").on("keyup", ".headerwrap .left h1", function(e) {
        if ($(this).text() !== "") {
          $("#notes [data-id='" + window.noted.selectedNote + "']").attr("data-id", $(this).text()).find("h2").text($(this).text());
          fs.rename(path.join(storage_dir, "Notebooks", window.noted.selectedList, window.noted.selectedNote + '.txt'), path.join(storage_dir, "Notebooks", window.noted.selectedList, $(this).text() + '.txt'));
          return window.noted.selectedNote = $(this).text();
        }
      });
      window.noted.editor = new EpicEditor({
        container: 'contentbody',
        file: {
          name: 'epiceditor',
          defaultContent: '',
          autoSave: 2500
        },
        theme: {
          base: '/themes/base/epiceditor.css',
          preview: '/themes/preview/style.css',
          editor: '/themes/editor/style.css'
        }
      });
      window.noted.editor.load();
      window.noted.editor.on("save", function(e) {
        var list;
        list = $("#notes li[data-id='" + window.noted.selectedNote + "']").attr("data-list");
        if (window.noted.selectedNote !== "") {
          return fs.writeFile(path.join(storage_dir, "Notebooks", list, window.noted.selectedNote + '.txt'), e.content);
        }
      });
      $('#new').click(function() {
        var defaultcontent, name;
        name = "Untitled Note";
        if (window.noted.selectedList !== "All Notes") {
          while (fs.existsSync(path.join(storage_dir, "Notebooks", window.noted.selectedList, name + '.txt')) === true) {
            name = name + "_";
          }
          $("#notes ul").append("<li data-id='" + name + "' data-list='" + window.noted.selectedList + "'><h2>" + name + "</h2><time></time></li>");
          defaultcontent = "Add some content!";
          return fs.writeFile(path.join(storage_dir, "Notebooks", window.noted.selectedList, name + '.txt'), defaultcontent);
        }
      });
      return $('#del').click(function() {
        window.noted.editor.remove('file');
        return fs.unlink(path.join(storage_dir, "Notebooks", $("#notes li[data-id='" + window.noted.selectedNote + "']").attr("data-list"), window.noted.selectedNote + '.txt'), function(err) {
          if (err) throw err;
          window.noted.deselectNote();
          return window.noted.loadNotes(window.noted.selectedList);
        });
      });
    },
    render: function() {
      return window.noted.listNotebooks();
    },
    listNotebooks: function() {
      console.log("NoteBooks Called");
      $("#notebooks ul").html("").append("<li class='all'>All Notes</li>");
      return fs.readdir(path.join(storage_dir, "Notebooks"), function(err, data) {
        var i;
        i = 0;
        while (i < data.length) {
          if (fs.statSync(path.join(storage_dir, "Notebooks", data[i])).isDirectory()) {
            $("#notebooks ul").append("<li data-id='" + data[i] + "'>" + data[i] + "</li>");
          }
          i++;
        }
        if (window.noted.selectedList === "all") {
          return $("#notebooks .all").trigger("click");
        } else {
          return $("#notebooks [data-id='" + window.noted.selectedList + "']").addClass("selected").trigger("click");
        }
      });
    },
    loadNotes: function(name, type) {
      console.log("Notes Called");
      if (name === "All Notes") {
        window.noted.selectedList = name;
        $("#notes ul").html("");
        return fs.readdir(path.join(storage_dir, "Notebooks"), function(err, data) {
          var i, _results;
          i = 0;
          _results = [];
          while (i < data.length) {
            if (fs.statSync(path.join(storage_dir, "Notebooks", data[i])).isDirectory()) {
              window.noted.loadNotes(data[i], "all");
            }
            _results.push(i++);
          }
          return _results;
        });
      } else {
        if (type !== "all") {
          window.noted.selectedList = name;
          $("#notes header h1").html(name);
          $("#notes ul").html("");
        } else {
          $("#notes header h1").html("All Notes");
        }
        return fs.readdir(path.join(storage_dir, "Notebooks", name), function(err, data) {
          var i, noteName, noteTime, time, _results;
          i = 0;
          _results = [];
          while (i < data.length) {
            if (data[i].substr(data[i].length - 4, data[i].length) === ".txt") {
              noteName = data[i].substr(0, data[i].length - 4);
              noteTime = fs.statSync(path.join(storage_dir, "Notebooks", name, noteName + '.txt'))['ctime'];
              time = new Date(Date.parse(noteTime));
              $("#notes ul").append("<li data-id='" + noteName + "' data-list='" + name + "'><h2>" + noteName + "</h2><time>" + time.getDate() + "/" + (time.getMonth() + 1) + "/" + time.getFullYear() + "</time></li>");
            }
            _results.push(i++);
          }
          return _results;
        });
      }
    },
    loadNote: function(selector) {
      console.log("Notes Called");
      window.noted.selectedNote = $(selector).find("h2").text();
      return fs.readFile(path.join(storage_dir, "Notebooks", $(selector).attr("data-list"), window.noted.selectedNote + '.txt'), 'utf-8', function(err, data) {
        var noteTime, time;
        if (err) throw err;
        $("#content").removeClass("deselected");
        $('.headerwrap .left h1').text(window.noted.selectedNote);
        noteTime = fs.statSync(path.join(storage_dir, "Notebooks", $(selector).attr("data-list"), window.noted.selectedNote + '.txt'))['ctime'];
        time = new Date(Date.parse(noteTime));
        $('.headerwrap .left time').text(window.noted.timeControls.pad(time.getDate()) + "/" + (window.noted.timeControls.pad(time.getMonth() + 1)) + "/" + time.getFullYear() + " " + window.noted.timeControls.pad(time.getHours()) + ":" + window.noted.timeControls.pad(time.getMinutes()));
        window.noted.editor.importFile('file', data);
        return window.noted.editor.preview();
      });
    },
    deselectNote: function() {
      $("#content").addClass("deselected");
      $("#content .left h1, #content .left time").text("");
      window.noted.selectedNote = "";
      window.noted.editor.importFile('file', "");
      return window.noted.editor.preview();
    }
  };

  window.noted.timeControls = {
    pad: function(n) {
      if (n < 10) {
        return "0" + n;
      } else {
        return n;
      }
    }
  };

  $(function() {
    window.noted.setupUI();
    if (node) {
      window.noted.setupPanel();
      return fs.readdir(path.join(storage_dir, "/Notebooks/"), function(err, data) {
        if (err) {
          if (err.code === "ENOENT") {
            return fs.mkdir(path.join(storage_dir, "/Notebooks/"), function() {
              return ncp(path.join(window.location.pathname, "../default_notebooks"), path.join(storage_dir, "/Notebooks/"), function(err) {
                return window.noted.render();
              });
            });
          }
        } else {
          return window.noted.render();
        }
      });
    }
  });

}).call(this);
