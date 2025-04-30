import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginSecretaireComponent } from './login-secretaire.component';

describe('LoginSecretaireComponent', () => {
  let component: LoginSecretaireComponent;
  let fixture: ComponentFixture<LoginSecretaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginSecretaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginSecretaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
