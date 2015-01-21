(function ($) {
    $.extend(true, window, {
        "Slick": {
            "Plugins": {
                "RowEditing": RowEditing
            }
        }
    });

    function RowEditing(options) {
        var _grid;
        var self = this;
        var buttonRowWidth = 150;
        var item, _initialized = false;
        var _rowEditor, _buttonRow, _saveButton, _cancelButton, _currentRow, _editors = [], _activeRow;
        var buttonPosition = {
            my: "left top",
            at: "left bottom",
            collision: "flip"
        };
        var _defaults = { showButton: true };
        var rowIndex = -1;

        function init(grid) {
            options = $.extend(true, {}, _defaults, options);
            _grid = grid;

            _rowEditor = $("<div class='slick-row-editor'></div>").appendTo(_grid.getCanvasNode()).hide();

            _saveButton = $("<input type='button' value='Save' />");
            _cancelButton = $("<input type='button' value='Cancel' />");
            _buttonRow = $("<div class='ui-widget-header row-button' />").width(buttonRowWidth);
            _saveButton.appendTo(_buttonRow);
            _cancelButton.appendTo(_buttonRow);
            _buttonRow.appendTo(_grid.getCanvasNode()).hide();

            _grid.onClick.subscribe(function (evt, args) {
                if (args.cell == options.cell) {
                    _editors = [];
                    _activeRow = args.row;
                    _currentRow = $(evt.target).closest(".slick-row");
                    createMockEditorRow();
                }
                evt.stopImmediatePropagation();
            });

            _grid.onColumnsResized.subscribe(function (evt, args) {
                if (!_initialized)
                    return;

                self.destroy();
                setEditableRow(_activeRow);
            });
        }

        function setEditableRow(row) {
            _editors = [];
            _activeRow = row;
            _currentRow = $(_grid.getRow(row).rowNode);
            createMockEditorRow();
        }

        function createMockEditorRow() {
            _rowEditor.height(_currentRow.height()).show();

            var width = _currentRow.width();
            var left = ((width - buttonRowWidth) / 2) + 'px';

            createEditorRow();

            _rowEditor.width(width)
                      .show().position($.extend({
                          of: _currentRow
                      }, {
                          my: "left top",
                          at: "left top"
                      }));

            if (options.showButton) {
                _cancelButton.unbind().bind('click', function (evt) {
                    var returnValue = self.onCancelRowEditing.notify({
                        item: item,
                        row: _currentRow,
                        grid: _grid,
                        self: self
                    }, evt, self);

                    if (returnValue === false)
                        return;

                    self.destroy();
                });

                _saveButton.unbind().bind('click', function (evt) {
                    commitChanges();
                });

                _buttonRow.show().position($.extend({
                    of: _currentRow
                }, buttonPosition));
                _buttonRow.css('left', left);
            }

            $('.slick-cell-editor', _rowEditor).unbind().bind('click', function (e) {
                e.stopImmediatePropagation();
            });

            _rowEditor.unbind().bind('keydown', function (evt) {
                evt.stopImmediatePropagation();
            });

            _initialized = true;
        }

        function commitChanges() {
            var valid = true;
            $(_editors).each(function (index, currentEditor) {
                valid = valid && currentEditor.commitChanges();
            });

            if (valid) {
                self.onRowEditing.notify({
                    item: item,
                    row: _currentRow,
                    grid: _grid,
                    self: self
                }, null, self);

                _grid.updateRow(_activeRow);
                self.destroy();
            }
            else {
                if ($.ui.tooltip) {
                    var toolTips = $(".slick-cell-editor", _rowEditor).tooltip({
                        tooltipClass: 'slickGridError',
                        position: { my: "left top", at: "left top-25", collision: "flipfit" }
                    });
                    toolTips.tooltip("open");
                }
            }
        }

        function createEditorRow() {
            var columns = _grid.getColumns();
            item = _grid.getDataItem(_activeRow);
            $('.slick-cell', _currentRow).each(function (i, o) {
                var pos = $(o).position();
                var columnDef = columns[i];

                var $div = $("<div class='slick-cell-editor'></div>");
                $div.width($(o).width())
                   .height($(o).height())
                   .css('left', pos.left)
                   .css('top', pos.top)
                   .appendTo(_rowEditor);

                var editor = _grid.getEditor(_activeRow, i);

                if (!editor) {
                    $div.html($(o).html());
                } else {
                    var returnValue = _grid.onBeforeEditCell.notify({
                        row: _activeRow,
                        cell: i,
                        item: item,
                        column: columnDef
                    }, null, _grid);

                    if (returnValue === false) {
                        return;
                    }

                    var currentEditor = new (editor)({
                        grid: _grid,
                        container: $div,
                        column: columnDef,
                        item: item || {}
                    });
                    if (item) {
                        currentEditor.loadValue(item);
                    }

                    currentEditor = $.extend({}, currentEditor, {
                        previousSerializedValue: currentEditor.serializeValue(),
                        commitChanges: commit,
                        container: $div
                    });

                    _editors.push(currentEditor);
                }
            });

            if (_editors.length > 0) {
                _editors[0].focus();
            }
        }

        function commit() {
            if (this.isValueChanged()) {
                var validationResults = this.validate();
                if (validationResults.valid) {
                    this.container.removeAttr('title');
                    this.applyValue(item, this.serializeValue());
                    return true;
                } else {
                    this.container.attr('title', validationResults.msg);
                    return false;
                }
            } else {
                this.container.removeAttr('title');
            }

            return true;
        }

        function clearRowEditor() {
            _saveButton.unbind();
            _cancelButton.unbind();
            _buttonRow.hide();
            _rowEditor.hide();
            _editors = [];
        }

        function destroy() {
            _initialized = false;
            clearRowEditor();
        }

        $.extend(this, {
            //Methods
            "init": init,
            "destroy": destroy,
            "setEditableRow": setEditableRow,
            "commitChanges": commitChanges,
            //Events
            "onRowEditing": new Slick.Event(),
            "onCancelRowEditing": new Slick.Event()
        });
    }
})(jQuery);