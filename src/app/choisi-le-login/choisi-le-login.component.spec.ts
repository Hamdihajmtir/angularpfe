import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoisiLeLoginComponent } from './choisi-le-login.component';

describe('ChoisiLeLoginComponent', () => {
  let component: ChoisiLeLoginComponent;
  let fixture: ComponentFixture<ChoisiLeLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChoisiLeLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoisiLeLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
