import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjouterInfirmiereComponent } from './ajouter-infirmiere.component';

describe('AjouterInfirmiereComponent', () => {
  let component: AjouterInfirmiereComponent;
  let fixture: ComponentFixture<AjouterInfirmiereComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AjouterInfirmiereComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjouterInfirmiereComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
