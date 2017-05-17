import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';
import { avatarImg } from 'discourse/widgets/post';
import { cook } from 'discourse/lib/text';
import RawHtml from 'discourse/widgets/raw-html';
import { ajax } from 'discourse/lib/ajax';
import showModal from 'discourse/lib/show-modal';

export default createWidget('profile', {
  tagName: 'div.user-profile.widget-container',
  buildKey: (attrs) => 'user-profile',

  defaultState(attrs) {
    return {
      topic: attrs.topic,
      bookmarked: attrs.topic ? attrs.topic.bookmarked : null,
      loaded: false,
      credit: 0
  }
},

canInviteToForum() {
    return Discourse.User.currentProp('can_invite_to_forum');
},

toggleBookmark() {
    this.state.bookmarked = !this.state.bookmarked;
    const topicController = this.register.lookup('controller:topic');
    topicController.send('toggleBookmark');
},

sendShowLogin() {
    const appRoute = this.register.lookup('route:application');
    appRoute.send('showLogin');
},

sendShowCreateAccount() {
    const appRoute = this.register.lookup('route:application');
    appRoute.send('showCreateAccount');
},

showInvite() {
    const topicRoute = this.register.lookup('route:topic');
    topicRoute.send('showLogin');
},
getReadTime(id){
    let self = this;
    self.state.loaded = true;
    ajax(`/discourseprofilewidget/data.json?user_id=${id}`).then(function(res){
        var credit = res.credit;
        var day = Math.floor(Number(credit)/(3600*24));
        credit = credit%(3600*24);
        var hours = Math.floor(Number(credit)/3600);
        credit = credit%(3600);
        var minutes = Math.floor(Number(credit)/60);
        if (minutes < 10 )
            minutes = `0${minutes}`;
        if (hours < 10)
            hours = `0${hours}`;
        if (day > 0)
            self.state.credit = `+${day}, ${hours}:${minutes}`
        else
            self.state.credit = `${hours}:${minutes}`
        self.scheduleRerender();
    });

},

html(attrs, state) {
    const { currentUser } = this;
    const topic = state.topic;
    let contents = []
    var trust_level = currentUser.get('trust_level');
    
    if (currentUser) {
      const username = currentUser.get('username');
      if(state.loaded == false)
      {
        if (trust_level != 0)
            this.getReadTime(currentUser.id);
        contents.push(
          avatarImg('large', {
            template: currentUser.get('avatar_template'),
            username: username
        }),
          h('div.handles', [
            h('h3', this.attach('link', {
              route: 'user',
              model: currentUser,
              className: 'user-activity-link',
              icon: 'user',
              rawLabel: username
          })),
            h('p', `@${username}`)
            ])
          );
    }
    else
    {
        contents.push(
          avatarImg('large', {
            template: currentUser.get('avatar_template'),
            username: username
        }),
          h('div.handles', [
            h('h3', this.attach('link', {
              route: 'user',
              model: currentUser,
              className: 'user-activity-link',
              icon: 'user',
              rawLabel: username
          })),
            h('p', `@${username}`)
            ]),
          h("div.credit", [
            h("img.credit-img", {attributes:{title: I18n.t("main.your-read-time"), width: "30px", heigth: "30px", src: "https://padpors.com/uploads/default/original/2X/2/2c10bf3e04d643a36a034475f4ea880793dda969.png"}}),
            h("span.credit-number", `${state.credit}`)])
          );
    }
} else {
  contents.push(
    h('div.widget-header', Discourse.SiteSettings.widget_profile_guest_welcome_title),
    h('div.welcome-body', new RawHtml({ html: cook(Discourse.SiteSettings.widget_profile_guest_welcome_body).string })),
    this.attach('button', {
      label: "sign_up",
      className: 'btn-primary sign-up-button',
      action: "sendShowCreateAccount"
  })
    )
}

contents.push(h('hr'))

if (topic) {
  if (currentUser && topic.details.can_invite_to) {
    contents.push(this.attach('button', {
      className: 'btn',
      label: 'topic.invite_reply.title',
      icon: 'envelope-o',
      action: 'showInvite'
  }))
}
contents.push(this.attach('button', {
    action: 'share',
    className: 'btn share',
    label: 'topic.share.title',
    icon: 'link',
    data: {
      'share-url': topic.get('shareUrl')
  }
}))
if (currentUser) {
    let tooltip = state.bookmarked ? 'bookmarks.created' : 'bookmarks.not_bookmarked';
    let label = state.bookmarked ? 'bookmarks.remove' : 'bookmarked.title';
    let buttonClass = 'btn bookmark';

    if (state.bookmarked) { buttonClass += ' bookmarked' }

        contents.push(
          this.attach('button', {
            action: 'toggleBookmark',
            title: tooltip,
            label: label,
            icon: 'bookmark',
            className: buttonClass
        }),
          this.attach('topic-notifications-button', {
            topic: topic,
            appendReason: true,
            showFullTitle: false
        })
          )
} else {
    contents.push(this.attach('button', {
      className: 'btn',
      label: 'topic.reply.title',
      icon: 'reply',
      action: 'sendShowLogin'
  }))
}
} else {
  if (!this.site.mobileView && this.canInviteToForum()) {
    contents.push(this.attach('link', {
      route: 'userInvited',
      className: 'btn',
      icon: 'user-plus',
      label: 'user.invited.title',
      model: currentUser
  }))
}
}
return h('div.widget-inner', contents);
}

});
