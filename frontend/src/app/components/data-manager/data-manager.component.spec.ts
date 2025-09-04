import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagerComponent } from './data-manager.component';

describe('DataManagerComponent', () => {
  let component: DataManagerComponent;
  let fixture: ComponentFixture<DataManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataManagerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
