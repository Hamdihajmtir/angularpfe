import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeSecretComponent } from './code-secret.component';

describe('CodeSecretComponent', () => {
  let component: CodeSecretComponent;
  let fixture: ComponentFixture<CodeSecretComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeSecretComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeSecretComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
