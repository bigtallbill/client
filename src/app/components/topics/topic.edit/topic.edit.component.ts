import { Component, Input, OnInit} from '@angular/core';
import {EditableTopic, Topic} from '../../../models/topic';
import {CategoryService} from '../../../services/category.service';
import {Category} from '../../../models/category';
import {Observable} from 'rxjs/Observable';
import {User} from '../../../models/user';
import {StorageService} from '../../../services/storage.service';
import {UserService} from '../../../services/user.service';
import {TopicService} from '../../../services/topic.service';
import { Router } from '@angular/router';
import {FormControl} from '@angular/forms';

@Component({
  selector: 'lr-topic-edit',
  templateUrl: './topic.edit.component.html',
  styleUrls: ['./topic.edit.component.styl']
})
export class TopicEditComponent implements OnInit {

  @Input()
  topic: EditableTopic = {
    category: null,
    acl: [],
    private: false,
    title: '',
    body: '',
    order: 0,
    id: null
  };

  userSearchTerm = '';

  userSearchTermField: FormControl;
  editing = false;
  submitted = false;
  disabled = false;
  sendButtonActive = false;
  userSearchActive = false;
  showSearchResults = false;
  focusedAclUser?: User;

  categoriesObservable: Observable<Category[]>;
  searchResults: User[];
  cachedSearchResults: User[];

  constructor(public categoryService: CategoryService,
              private router: Router,
              private store: StorageService,
              private userService: UserService,
              private topicService: TopicService) {
    this.categoriesObservable = this.categoryService.getCategories();
    this.userService.getUser().subscribe(u => {
      this.topic.user = u;
    });
  }

  ngOnInit() {
    this.cachedSearchResults = [];
    this.focusedAclUser = null;
    this.categoriesObservable = this.categoryService.load();
    this.userService.getUsers(null).subscribe((users) => {
      this.cachedSearchResults = users;
      this.updateSearchResults();
    });
    this.loadDraft();

    this.userSearchTermField = new FormControl('');
    this.userSearchTermField
      .valueChanges
      .subscribe(term => {
        this.runSearch(term);
      });
  }

  loadDraft() {
    if (!this.topic.id) {
      const topic = this.store.get(this.sid());
      if (topic) {
        this.topic = Object.assign(new Topic(), topic);
      }
    }
  }
  saveDraft() {
    this.store.set(this.sid(), this.topic);
  }

  discardDraft() {
    this.store.remove(this.sid());
  }

  private updateSearchResults() {
    this.searchResults = this.cachedSearchResults.filter(user => {
      return !this.inArray(user, this.topic.acl);
    });
    this.showSearchResults = this.searchResults.length > 0 && this.userSearchActive;
    if (!this.focusedAclUser && this.searchResults.length > 0) {
      this.focusedAclUser = this.searchResults[0];
    }
  }

  showSearch() {
    this.userSearchActive = true;
    this.runSearch();
  }

  hideSearch() {
    this.userSearchActive = false;
    setTimeout(() => this.updateSearchResults(), 200);
  }

  userSearchKeyDown($event) {
    console.log($event);
    let index = this.searchResults.indexOf(this.focusedAclUser);
    switch ($event.keyCode) {
      case 38: // up
        index--;
        if (index < 0) {
          index = this.searchResults.length - 1;
        }
        $event.preventDefault();
        break;
      case 40: // down
        index++;
        if (index > this.searchResults.length - 1) {
          index = 0;
        }
        $event.preventDefault();
        break;
      case 13: // Enter
        this.addToAcl(this.focusedAclUser);
        $event.preventDefault();
        break;
      case 27: // Escape
        this.hideSearch();
        break;
      case 8: // Backspace
        if (this.userSearchTermField.value === '') {
          this.topic.acl.pop();
        }
        break;
    }
    if (index !== -1 &&  this.searchResults[index]) {
      this.focusedAclUser = this.searchResults[index];
    } else {
      this.runSearch();
    }
    try {
      setTimeout(() => {
        const el = document.querySelector('.acl-list-box .focus img');
        el && el.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
      }, 100);
    } catch (e) {
      //
    }
  }

  formUpdate(e) {
    console.log(e);
  }

  onSubmit() {

    this.saveDraft();
    this.sendButtonActive = true;
    this.topicService
      .saveTopic(this.topic)
      .subscribe(t => {
      this.discardDraft();
      this.topic = t;
      this.sendButtonActive = true;
      this.router.navigate(['topics/' + t.slug]);
    });
  }

  docClick() {
    //
  }

  trackById(i, v) {
    return v.id;
  }

  private sid(): string {
    if (this.topic.id) {
      return 'topic' + this.topic.id + 'Draft';
    } else {
      return 'topic0Draft';
    }
  }

  runSearch(term = null) {
    const options = {
      term: term || this.userSearchTermField.value,
      exclude: this.topic.acl.reduceRight((a, u: User) => {
        a.push(u.id);
        return a;
      }, [])
    };
    this.userService
      .getUsers(options);
  }

  setAclFocus(item: User) {
    this.focusedAclUser = item;
  }

  isFocused(item: User): boolean {
    return this.focusedAclUser.id === item.id;
  }

  addToAcl(user: User) {
    if (!this.inArray(user, this.topic.acl)) {
      this.topic.acl.push(user);
    }
    this.updateSearchResults();
    this.saveDraft();
  }

  inArray(user: User, arr: User[]) {
    return arr.some(item => {
      return item.id === user.id;
    });
  }

  removeFromAcl(user: User) {
    this.topic.acl = this.topic.acl.filter(item => user.id !== item.id);
    this.updateSearchResults();
    this.saveDraft();
  }

}
