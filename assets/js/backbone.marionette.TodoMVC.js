$(function(){
    var TodoMVC = new Backbone.Marionette.Application();

    TodoMVC.addRegions({
        header: '#header',
        main: '#main',
        footer: '#footer'
    });

    TodoMVC.on('initialize:after', function() {
        Backbone.history.start();
    });

    TodoMVC.module('Todos', function(Todos, App, Backbone, Marionette, $, _) {

        // Local Variables
        // ---------------

        var localStorageKey = 'todos-backbone-marionettejs';

        // Todo Model
        // ----------

        Todos.Todo = Backbone.Model.extend({
            localStorage: new Backbone.LocalStorage(localStorageKey),

            defaults: {
                title: '',
            completed: false,
            created: 0
            },

            initialize: function() {
                            if (this.isNew()) {
                                this.set('created', Date.now());
                            }
                        },

            toggle: function() {
                        return this.set('completed', !this.isCompleted());
                    },

            isCompleted: function() {
                             return this.get('completed');
                         }
        });

        // Todo Collection
        // ---------------

        Todos.TodoList = Backbone.Collection.extend({
            model: Todos.Todo,

            localStorage: new Backbone.LocalStorage(localStorageKey),

            getCompleted: function() {
                return this.filter(this._isCompleted);
            },

            getActive: function() {
                           return this.reject(this._isCompleted);
                       },

            comparator: function(todo) {
                            return todo.get('created');
                        },

            _isCompleted: function(todo){
                              return todo.isCompleted();
                          }
        });

    });
    TodoMVC.module('Layout', function(Layout, App, Backbone, Marionette, $, _) {

        // Layout Header View
        // ------------------

        Layout.Header = Backbone.Marionette.ItemView.extend({
            template: '#template-header',

            // UI bindings create cached attributes that
            // point to jQuery selected objects
            ui: {
                input: '#new-todo'
            },

            events : {
                         'keypress #new-todo': 'onInputKeypress',
            'blur #new-todo': 'onTodoBlur'
                     },

            onTodoBlur: function(){
                            var todoText = this.ui.input.val().trim();
                            this.createTodo(todoText);
                        },

            onInputKeypress: function(e) {
                                 var ENTER_KEY = 13;
                                 var todoText = this.ui.input.val().trim();

                                 if ( e.which === ENTER_KEY && todoText ) {
                                     this.createTodo(todoText);
                                 }
                             },

            completeAdd: function(){
                             this.ui.input.val('');
                         },

            createTodo: function(todoText){
                            if (todoText.trim() === ""){ return; }

                            this.collection.create({
                                title: todoText
                            });

                            this.completeAdd();
                        }
        });

        // Layout Footer View
        // ------------------

        Layout.Footer = Backbone.Marionette.Layout.extend({
            template: '#template-footer',

            // UI bindings create cached attributes that
            // point to jQuery selected objects
            ui: {
                todoCount: '#todo-count .count',
            todoCountLabel: '#todo-count .label',
            clearCount: '#clear-completed .count',
            filters: '#filters a'
            },

            events: {
                        'click #clear-completed': 'onClearClick'
                    },

            initialize : function() {
                             this.bindTo(App.vent, 'todoList:filter', this.updateFilterSelection, this);
                             this.bindTo(this.collection, 'all', this.updateCount, this);
                         },

            onRender: function() {
                          this.updateCount();
                      },

            updateCount: function() {
                             var activeCount = this.collection.getActive().length,
                             completedCount = this.collection.getCompleted().length;
                             this.ui.todoCount.html(activeCount);
                             this.ui.todoCountLabel.html(activeCount === 1 ? 'item' : 'items');
                             this.ui.clearCount.html(completedCount === 0 ? '' : '(' + completedCount + ')');
                         },

            updateFilterSelection : function(filter) {
                                        this.ui.filters
                                            .removeClass('selected')
                                            .filter('[href="#' + filter + '"]')
                                            .addClass('selected');
                                    },

            onClearClick: function() {
                              var completed = this.collection.getCompleted();
                              completed.forEach(function destroy(todo) {
                                  todo.destroy();
                              });
                          }
        });

    });
    TodoMVC.module('TodoList.Views', function(Views, App, Backbone, Marionette, $, _) {

        // Todo List Item View
        // -------------------
        //
        // Display an individual todo item, and respond to changes
        // that are made to the item, including marking completed.

        Views.ItemView = Marionette.ItemView.extend({
            tagName: 'li',
            template: '#template-todoItemView',

            ui: {
                edit: '.edit'
            },

            events : {
                         'click .destroy': 'destroy',
            'dblclick label': 'onEditClick',
            'keypress .edit': 'onEditKeypress',
            'blur .edit': 'onEditBlur',
            'click .toggle' : 'toggle'
                     },

            initialize: function() {
                            this.bindTo(this.model, 'change', this.render, this);
                        },

            onRender: function() {
                          this.$el.removeClass('active completed');

                          if (this.model.get('completed')) {
                              this.$el.addClass('completed');
                          } else {
                              this.$el.addClass('active');
                          }
                      },

            destroy: function() {
                         this.model.destroy();
                     },

            toggle: function() {
                        this.model.toggle().save();
                    },

            onEditClick: function() {
                             this.$el.addClass('editing');
                             this.ui.edit.focus();
                         },

            updateTodo : function() {
                             var todoText = this.ui.edit.val();
                             if (todoText === '') {
                                 return this.destroy();
                             }
                             this.setTodoText(todoText);
                             this.completeEdit();
                         },

            onEditBlur: function(e){
                            this.updateTodo();
                        },

            onEditKeypress: function(e) {
                                var ENTER_KEY = 13;
                                if (e.which === ENTER_KEY) {
                                    this.updateTodo();
                                }
                            },

            setTodoText: function(todoText){
                             if (todoText.trim() === ""){ return; }
                             this.model.set('title', todoText).save();
                         },

            completeEdit: function(){
                              this.$el.removeClass('editing');
                          }
        });

        // Item List View
        // --------------
        //
        // Controls the rendering of the list of items, including the
        // filtering of activs vs completed items for display.

        Views.ListView = Backbone.Marionette.CompositeView.extend({
            template: '#template-todoListCompositeView',
            itemView: Views.ItemView,
            itemViewContainer: '#todo-list',

            ui: {
                toggle: '#toggle-all'
            },

            events : {
                         'click #toggle-all': 'onToggleAllClick'
                     },

            initialize: function() {
                            this.bindTo(this.collection, 'all', this.update, this);
                        },

            onRender: function() {
                          this.update();
                      },

            update: function() {
                        function reduceCompleted(left, right) {
                            return left && right.get('completed');
                        }

                        var allCompleted = this.collection.reduce(reduceCompleted,true);

                        this.ui.toggle.prop('checked', allCompleted);
                        this.$el.parent().toggle(!!this.collection.length);
                    },

            onToggleAllClick: function(e) {
                                  var isChecked = e.currentTarget.checked;

                                  this.collection.each(function(todo){
                                      todo.save({'completed': isChecked});
                                  });
                              }
        });

        // Application Event Handlers
        // --------------------------
        //
        // Handler for filtering the list of items by showing and
        // hiding through the use of various CSS classes

        App.vent.on('todoList:filter', function(filter) {
            filter = filter || 'all';
            $('#todoapp').attr('class', 'filter-' + filter);
        });

    });
    TodoMVC.module('TodoList', function(TodoList, App, Backbone, Marionette, $, _) {

        // TodoList Router
        // ---------------
        //
        // Handle routes to show the active vs complete todo items

        TodoList.Router = Marionette.AppRouter.extend({
            appRoutes: {
                           '*filter': 'filterItems'
                       }
        });

        // TodoList Controller (Mediator)
        // ------------------------------
        //
        // Control the workflow and logic that exists at the application
        // level, above the implementation detail of views and models

        TodoList.Controller = function() {
            this.todoList = new App.Todos.TodoList();
        };

        _.extend(TodoList.Controller.prototype, {

            // Start the app by showing the appropriate views
            // and fetching the list of todo items, if there are any
            start: function(){
                       this.showHeader(this.todoList);
                       this.showFooter(this.todoList);
                       this.showTodoList(this.todoList);

                       App.bindTo(this.todoList, 'reset add remove', this.toggleFooter, this);
                       this.todoList.fetch();
                   },

            showHeader: function(todoList) {
                            var header = new App.Layout.Header({
                                collection: todoList
                            });
                            App.header.show(header);
                        },

            showFooter: function(todoList) {
                            var footer = new App.Layout.Footer({
                                collection: todoList
                            });
                            App.footer.show(footer);
                        },

            showTodoList: function(todoList) {
                              App.main.show(new TodoList.Views.ListView({
                                  collection : todoList
                              }));
                          },

            toggleFooter: function() {
                              App.footer.$el.toggle(this.todoList.length);
                          },

            // Set the filter to show complete or all items
            filterItems: function(filter) {
                             App.vent.trigger('todoList:filter', filter.trim() || '');
                         }
        });

        // TodoList Initializer
        // --------------------
        //
        // Get the TodoList up and running by initializing the mediator
        // when the the application is started, pulling in all of the
        // existing Todo items and displaying them.

        TodoList.addInitializer(function() {
            var controller = new TodoList.Controller();
            new TodoList.Router({
                controller: controller
            });

            controller.start();
        });

    });

    TodoMVC.start();
});
