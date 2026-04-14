(function($) {
    if (!window.shoeinvRTEC || !$('#rtec-form').length) return;

    var data = window.shoeinvRTEC;

    // Build dropdown
    var $select = $('<select>', {
        name: 'rtec_shoe_size',
        id: 'shoeinv-size-select',
        required: true
    });
    $select.append($('<option>', { value: '', text: data.i18n.choose || 'בחרי מידת נעל *' }));

    $.each(data.sizes, function(i, size) {
        var label = (size === 'BYOS') ? (data.i18n.byos || 'אביא נעליים משלי') : size;
        $select.append($('<option>', { value: size, text: label }));
    });

    var $wrapper = $('<div>', { 'class': 'rtec-form-field shoeinv-size-field' });
    $wrapper.append($('<label>', { 'for': 'shoeinv-size-select', text: data.i18n.label || 'מידת נעל *' }));
    $wrapper.append($('<div>', { 'class': 'rtec-input-wrapper' }).append($select));

    // Insert before the submit button container
    var $buttons = $('#rtec-form .rtec-form-buttons');
    if ($buttons.length) {
        $buttons.before($wrapper);
    } else {
        $('#rtec-form').append($wrapper);
    }

    // Real-time availability via AJAX
    $.post(data.ajaxUrl, {
        action: 'shoeinv_get_sizes',
        session_id: data.eventId,
        nonce: data.nonce
    }, function(resp) {
        if (!resp || !resp.success || !resp.data) return;
        $.each(resp.data, function(i, item) {
            if (item.available === 'sold_out') {
                $select.find('option[value="' + item.size + '"]')
                    .prop('disabled', true)
                    .text(item.size + ' (' + (data.i18n.soldOut || 'אזל המלאי') + ')');
            }
        });
    });

})(jQuery);
