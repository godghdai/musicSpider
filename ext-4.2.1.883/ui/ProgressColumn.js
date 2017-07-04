Ext.define('Ext.grid.column.Progress', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.progresscolumn'],
    alternateClassName: 'Ext.grid.ProgressColumn',
    defaultRenderer: function(v, meta, record, rowIdx, colIdx, store, view) {
        return '<div class="x-progress x-progress-default x-border-box" style="width:100px;height:15px;">' +
            '<div class="x-progress-text x-progress-text-back" style="width: 100px;line-Height:15px;" id="'+record.data["id"]+"_a"+'">'+v+'%</div>' +
            '<div class="x-progress-bar x-progress-bar-default" style="width:'+v+'%;" id="'+record.data["id"]+"_b"+'">' +
            '<div class="x-progress-text" style="width: 100px;line-Height:15px;"><div id="'+record.data["id"]+"_c"+'">'+v+'%</div></div>' +
            '</div></div>';
    }
});