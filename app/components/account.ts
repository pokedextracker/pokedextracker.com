import { Component, OnInit } from 'angular2/core';
import { Router }            from 'angular2/router';
import { Title }             from 'angular2/platform/browser';
import { Angulartics2 }      from 'angulartics2';

import { NavComponent }   from './nav';
import { SessionService } from '../services/session';
import { User }           from '../classes/user';
import { UserService }    from '../services/user';

const HTML = require('../views/account.html');

@Component({
  directives: [NavComponent],
  providers: [SessionService, Title, UserService],
  selector: 'account',
  template: HTML
})
export class AccountComponent implements OnInit {

  public error: string = null;
  public loading: boolean = false;
  public password: boolean = false;
  public success: boolean = false;
  public _session: SessionService;
  public user: User;

  private _angulartics: Angulartics2;
  private _router: Router;
  private _title: Title;
  private _user: UserService;

  constructor (_angulartics: Angulartics2, _router: Router, _session: SessionService, _title: Title, _user: UserService) {
    this._angulartics = _angulartics;
    this._router = _router;
    this._session = _session;
    this._title = _title;
    this._user = _user;
  }

  public ngOnInit () {
    if (!this._session.user) {
      return this._router.navigate(['Login']);
    }

    this.reset();

    this._title.setTitle('Account | Pokédex Tracker');
  }

  public togglePassword () {
    this.password = !this.password;

    if (!this.password) {
      delete this.user.password;
      delete this.user.password_confirm;
    }
  }

  public updateUser (payload: User) {
    this.error = null;
    this.success = false;

    if (payload.password !== payload.password_confirm) {
      return this.error = 'passwords need to match';
    }

    this.loading = true;

    this._user.update(payload)
    .then((session) => {
      this.loading = false;
      this.success = true;
      localStorage.setItem('token', session.token);

      this.reset();

      this._angulartics.eventTrack.next({
        action: 'update',
        properties: { category: 'User' }
      });
    })
    .catch((err) => {
      this.loading = false;
      this.error = err.message;
    });
  }

  private reset () {
    this.user = new User({ friend_code: this._session.user.friend_code });
    this.password = false;
  }

}
