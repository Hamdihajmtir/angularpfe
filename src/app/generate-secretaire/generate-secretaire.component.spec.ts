import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateSecretaireComponent } from './generate-secretaire.component';

describe('GenerateSecretaireComponent', () => {
  let component: GenerateSecretaireComponent;
  let fixture: ComponentFixture<GenerateSecretaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenerateSecretaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerateSecretaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
