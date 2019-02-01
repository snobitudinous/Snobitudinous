$(document).ready(() => {

  $('.delete-post').on('click', (e) => {
    $target = $(e.target);
    const id = $target.attr('data-id');
    $.ajax({
      type: 'DELETE',
      url: '/posts/'+id,
      success: (response) => {
        alert('Deleting Post');
        window.location.href = '/';
      },
      error: (err) => {
        console.log(err);
      }
    });
  });

  $('.expand-post').on('click', (e) => {
    $target = $(e.target);
    const id = $target.attr('data-id');
    $target.toggleClass('showing');
    $('.expand-item[data-id='+id+']').toggle();
    if($target.hasClass('showing')){
      $target.text('▲');
    } else {
      $target.text('▼');
    }
  });

  // $('.edit-post').on('click', (e) => {
  //   $('.editing').toggle();
  // });
  //
  // $('.submit-edit').on('click', (e) => {
  //   // e.preventDefault();
  //   // $target = $(e.target);
  //   // id = $target.attr('data-id');
  //   // $.ajax({
  //   //   type:'PUT',
  //   //   url:'/posts/'+id,
  //   //   data: JSON.stringify(data),
  //   //   success:function(){
  //       $('.editing').toggle();
  //       $('.post-body').text($('.edited-post-body').val());
  //       $('.post-title').text($('.edited-post-title').val());
  //  //    },
  //  //    error: (err) => {
  //  //      console.log(err);
  //  //    }
  //  // });
  // });
  //
  // $('.cancel-edit').on('click', () => {
  //   $('.editing').toggle();
  // });

  $(".submit-image").change((e) => {
    $target = $(e.target);
    var filename = $target.val();

    if(filename) {
        $('.submit-image-label').text(filename);
    }
});
});
